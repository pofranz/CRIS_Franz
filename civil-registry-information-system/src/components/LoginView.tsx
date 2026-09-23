import React, { useState } from 'react';
import { authService } from '../services/auth';
import { UserAccount } from '../types';
import { Lock, User, Eye, EyeOff, ShieldCheck, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!identifier.trim()) {
      setErrorMessage('Please enter your username, email, or mobile phone number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authService.login(identifier, password);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
      }
    }, 200);
  };

  const handleQuickLogin = (idVal: string, passVal: string) => {
    setIdentifier(idVal);
    setPassword(passVal);
    const res = authService.login(idVal, passVal);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col justify-between font-sans">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-[#0F172A] px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              CIVIL REGISTRY INFORMATION SYSTEM
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                CRIS v4.0 HIGH DENSITY
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Official Electronic Registry Archive & Certification Portal</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>LCR Forms 1A/B/C • 2A/B/C • 3A/B/C Certified</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-blue-600 mb-3">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff & MCR Authentication</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in using your assigned <strong>Username</strong>, <strong>Email</strong>, or <strong>Phone Number</strong>
            </p>
          </div>

          {errorMessage && (
            <div
              id="login-error-alert"
              className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Username / Email / Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="franzpo / fjp.culaba@gmail.com / 0955..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Sign In to Registry
                </>
              )}
            </button>
          </form>

          {/* Security Notice on No Public Registration */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Notice:</strong> Self-registration is strictly disabled by civil registry law. Account credentials
              are managed directly by the Municipal Civil Registrar and Superadmin.
            </p>
          </div>

          {/* One-Click Demo Logins for Quick Testing */}
          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-2 text-center">
              Quick Test Accounts (Click to Fill & Sign In)
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                id="quick-superadmin-btn"
                onClick={() => handleQuickLogin('franzpo', 'franzpo')}
                className="text-left px-3 py-2 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-md text-xs transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Superadmin (FRANCIS JEFF C. PO)</span>
                  <span className="text-[11px] text-slate-500 group-hover:text-blue-600">
                    user: franzpo • phone: 09557213860
                  </span>
                </div>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-mono font-bold">
                  Superadmin
                </span>
              </button>

              <button
                type="button"
                id="quick-mcr-btn"
                onClick={() => handleQuickLogin('mcr_admin', 'password123')}
                className="text-left px-3 py-2 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-md text-xs transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-900 block">MCR (HON. ATTY. ROBERTO G. MENDOZA)</span>
                  <span className="text-[11px] text-slate-500 group-hover:text-blue-600">
                    user: mcr_admin • email: mcr@culaba.gov.ph
                  </span>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-bold">
                  MCR
                </span>
              </button>

              <button
                type="button"
                id="quick-clerk-btn"
                onClick={() => handleQuickLogin('clerk_maria', 'password123')}
                className="text-left px-3 py-2 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-md text-xs transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Registration Clerk (MARIA CRISTINA SANTOS)</span>
                  <span className="text-[11px] text-slate-500 group-hover:text-blue-600">
                    user: clerk_maria (Read/Write/Issue, No Delete)
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                  Clerk
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500">
        Office of the Municipal Civil Registrar • Republic of the Philippines • Secure Digital Civil Registry Archives
      </footer>
    </div>
  );
};
