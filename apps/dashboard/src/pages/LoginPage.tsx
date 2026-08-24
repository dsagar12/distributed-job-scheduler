import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cpu, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, isLoading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('admin@scheduler.io');
  const [password, setPassword] = useState('AdminSecurePass123!');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegister) {
        await register({
          email: email.trim(),
          password,
          fullName: fullName.trim() || 'Administrator',
          organizationName: orgName.trim() || undefined,
        });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleInstantLogin = async () => {
    setError(null);
    try {
      await login({
        email: 'admin@scheduler.io',
        password: 'AdminSecurePass123!',
      });
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-4 font-sans antialiased text-slate-900">
      <div className="w-full max-w-[420px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Distributed Job Scheduler
          </h1>
          <p className="text-xs text-slate-500">
            Developer &amp; Infrastructure Control Console
          </p>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all text-center ${
              !isRegister
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all text-center ${
              isRegister
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Quick Demo Access Pill */}
        <div className="px-3.5 py-2.5 bg-blue-50/60 border border-blue-200/70 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-mono text-slate-700 block truncate">
                admin@scheduler.io
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstantLogin}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors shrink-0 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            Instant Login
          </button>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegister && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Platform Engineer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="infra-input w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Acme Platform Eng"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="infra-input w-full"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="admin@scheduler.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="infra-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="infra-input pr-9 w-full font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center text-[11px] text-slate-400">
          Enterprise Session Protected by 256-bit Encryption
        </div>

      </div>
    </div>
  );
};
