import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cpu, ArrowRight, Lock, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, isLoading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegister) {
        await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          organizationName: orgName.trim() || undefined,
        });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleInstantAdminLogin = async () => {
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

  const fillDemoCredentials = () => {
    setIsRegister(false);
    setEmail('admin@scheduler.io');
    setPassword('AdminSecurePass123!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xl">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
            <Cpu className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
            Distributed Job Scheduler
          </h1>
          <p className="text-xs text-slate-500">
            Developer &amp; Infrastructure Control Console
          </p>
        </div>

        {/* Demo Credentials Quick Fill Banner */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-900 font-bold">Admin Demo Credentials</span>
              <span className="text-[11px] text-slate-500 font-mono">admin@scheduler.io</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="infra-btn-secondary text-[11px] px-2.5 py-1"
            >
              Auto Fill
            </button>
            <button
              type="button"
              onClick={handleInstantAdminLogin}
              disabled={isLoading}
              className="infra-btn-primary text-[11px] px-3 py-1 font-bold"
            >
              Instant Login
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="infra-input pl-9 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Organization Name</label>
                <input
                  type="text"
                  placeholder="Acme Platform Engineering"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="infra-input w-full"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="admin@scheduler.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="infra-input pl-9 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="infra-input pl-9 w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="infra-btn-primary w-full py-2.5 mt-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isRegister ? 'Create Account & Cluster' : 'Sign In to Cluster'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-blue-600 hover:underline font-medium transition-colors"
          >
            {isRegister ? 'Already registered? Sign In' : "Don't have an account? Create an Organization"}
          </button>
        </div>
      </div>
    </div>
  );
};
