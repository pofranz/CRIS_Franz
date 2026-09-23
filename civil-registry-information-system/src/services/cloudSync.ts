import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AnyRegistryRecord,
  IssuedCertification,
  SiteSettings,
  MunicipalCertificateTemplate,
  RegistryCategory,
} from '../types';
import { STORAGE_KEYS } from './storage';

// Helper to remove undefined properties which Firestore does not allow
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

type SyncCallback = () => void;
const listeners: Set<SyncCallback> = new Set();

export function subscribeToCloudSync(cb: SyncCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifySubscribers() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error notifying sync subscriber:', e);
    }
  });
}

let isInitialized = false;
let isApplyingRemoteUpdate = false;

export const cloudSyncService = {
  isInitialized: () => isInitialized,

  /**
   * Initializes real-time two-way synchronization between Firestore and LocalStorage.
   */
  async init() {
    if (isInitialized) return;
    isInitialized = true;

    try {
      // 1. Set up real-time listener for registry_records
      const recordsCol = collection(db, 'registry_records');
      onSnapshot(recordsCol, (snapshot) => {
        if (snapshot.empty) {
          // If remote cloud collection is completely empty, populate it with local records
          this.seedInitialLocalDataToCloud();
          return;
        }

        if (isApplyingRemoteUpdate) return;
        isApplyingRemoteUpdate = true;

        try {
          const births: AnyRegistryRecord[] = [];
          const marriages: AnyRegistryRecord[] = [];
          const deaths: AnyRegistryRecord[] = [];
          const legals: AnyRegistryRecord[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AnyRegistryRecord;
            if (!data || !data.category) return;
            if (data.category === 'births') births.push(data);
            else if (data.category === 'marriages') marriages.push(data);
            else if (data.category === 'deaths') deaths.push(data);
            else if (data.category === 'legal-instruments') legals.push(data);
          });

          // Sync into localStorage
          localStorage.setItem(STORAGE_KEYS.BIRTHS, JSON.stringify(births));
          localStorage.setItem(STORAGE_KEYS.MARRIAGES, JSON.stringify(marriages));
          localStorage.setItem(STORAGE_KEYS.DEATHS, JSON.stringify(deaths));
          localStorage.setItem(STORAGE_KEYS.LEGAL, JSON.stringify(legals));

          notifySubscribers();
        } catch (err) {
          console.error('Error syncing remote records to local storage:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore records subscription warning:', err);
      });

      // 2. Set up real-time listener for issued_certifications
      const certsCol = collection(db, 'issued_certifications');
      onSnapshot(certsCol, (snapshot) => {
        if (isApplyingRemoteUpdate || snapshot.empty) return;
        isApplyingRemoteUpdate = true;
        try {
          const certs: IssuedCertification[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as IssuedCertification;
            if (data && data.certNumber) certs.push(data);
          });
          if (certs.length > 0) {
            localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(certs));
            notifySubscribers();
          }
        } catch (err) {
          console.error('Error syncing remote certs to local:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore certs subscription warning:', err);
      });

      // 3. Set up real-time listener for system_settings
      const settingsDocRef = doc(db, 'system_settings', 'global');
      onSnapshot(settingsDocRef, (docSnap) => {
        if (isApplyingRemoteUpdate || !docSnap.exists()) return;
        isApplyingRemoteUpdate = true;
        try {
          const remoteSettings = docSnap.data() as SiteSettings;
          if (remoteSettings && remoteSettings.officeName) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remoteSettings));
            notifySubscribers();
          }
        } catch (err) {
          console.error('Error syncing remote settings to local:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore settings subscription warning:', err);
      });

      // 4. Set up real-time listener for custom_templates
      const templatesCol = collection(db, 'custom_templates');
      onSnapshot(templatesCol, (snapshot) => {
        if (isApplyingRemoteUpdate || snapshot.empty) return;
        isApplyingRemoteUpdate = true;
        try {
          const templates: MunicipalCertificateTemplate[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as MunicipalCertificateTemplate;
            if (data && data.id) templates.push(data);
          });
          if (templates.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
            notifySubscribers();
          }
        } catch (err) {
          console.error('Error syncing remote templates to local:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore templates subscription warning:', err);
      });

    } catch (err) {
      console.error('Failed to initialize Firestore cloud synchronization:', err);
    }
  },

  /**
   * Pushes initial local data up to Firestore if the cloud is blank.
   */
  async seedInitialLocalDataToCloud() {
    try {
      const getLocalList = (key: string): any[] => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      };

      const allRecords: AnyRegistryRecord[] = [
        ...getLocalList(STORAGE_KEYS.BIRTHS),
        ...getLocalList(STORAGE_KEYS.MARRIAGES),
        ...getLocalList(STORAGE_KEYS.DEATHS),
        ...getLocalList(STORAGE_KEYS.LEGAL),
      ];

      if (allRecords.length > 0) {
        const batch = writeBatch(db);
        allRecords.forEach((rec) => {
          if (!rec.id) return;
          const ref = doc(db, 'registry_records', rec.id);
          batch.set(ref, cleanForFirestore(rec), { merge: true });
        });
        await batch.commit();
      }

      const allCerts: IssuedCertification[] = getLocalList(STORAGE_KEYS.CERTS);
      if (allCerts.length > 0) {
        const certBatch = writeBatch(db);
        allCerts.forEach((cert) => {
          if (!cert.id) return;
          const ref = doc(db, 'issued_certifications', cert.id);
          certBatch.set(ref, cleanForFirestore(cert), { merge: true });
        });
        await certBatch.commit();
      }

      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const settings = JSON.parse(rawSettings);
        await setDoc(doc(db, 'system_settings', 'global'), cleanForFirestore(settings), { merge: true });
      }
    } catch (err) {
      console.warn('Error during initial cloud seeding:', err);
    }
  },

  /**
   * Push a single registry record to the cloud.
   */
  async syncRecord(record: AnyRegistryRecord) {
    if (!record || !record.id) return;
    try {
      const ref = doc(db, 'registry_records', record.id);
      await setDoc(ref, cleanForFirestore(record), { merge: true });
    } catch (err) {
      console.error('Failed to sync record to Firestore:', err);
    }
  },

  /**
   * Delete a record from the cloud.
   */
  async deleteRecord(id: string) {
    if (!id) return;
    try {
      const ref = doc(db, 'registry_records', id);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Failed to delete record from Firestore:', err);
    }
  },

  /**
   * Push an issued certification to the cloud.
   */
  async syncCertification(cert: IssuedCertification) {
    if (!cert || !cert.id) return;
    try {
      const ref = doc(db, 'issued_certifications', cert.id);
      await setDoc(ref, cleanForFirestore(cert), { merge: true });
    } catch (err) {
      console.error('Failed to sync certification to Firestore:', err);
    }
  },

  /**
   * Delete an issued certification from the cloud.
   */
  async deleteCertification(id: string) {
    if (!id) return;
    try {
      const ref = doc(db, 'issued_certifications', id);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Failed to delete certification from Firestore:', err);
    }
  },

  /**
   * Push site settings to the cloud.
   */
  async syncSettings(settings: SiteSettings) {
    if (!settings) return;
    try {
      const ref = doc(db, 'system_settings', 'global');
      await setDoc(ref, cleanForFirestore(settings), { merge: true });
    } catch (err) {
      console.error('Failed to sync settings to Firestore:', err);
    }
  },

  /**
   * Push a template to the cloud.
   */
  async syncTemplate(template: MunicipalCertificateTemplate) {
    if (!template || !template.id) return;
    try {
      const ref = doc(db, 'custom_templates', template.id);
      await setDoc(ref, cleanForFirestore(template), { merge: true });
    } catch (err) {
      console.error('Failed to sync template to Firestore:', err);
    }
  },

  /**
   * Delete a template from the cloud.
   */
  async deleteTemplate(id: string) {
    if (!id) return;
    try {
      const ref = doc(db, 'custom_templates', id);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Failed to delete template from Firestore:', err);
    }
  },

  /**
   * Force manual push of all local data to Firestore.
   */
  async manualPushAllToCloud(): Promise<void> {
    await this.seedInitialLocalDataToCloud();
  },
};
