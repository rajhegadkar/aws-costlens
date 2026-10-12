import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { loginUser } from '../api/client.js';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginUser(username, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user.username);
      } else {
        setError(res.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection to local authentication server failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-orange-500 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-xl shadow-orange-500/25 mb-4 text-white">
            <Cloud className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            AWS Cost<span className="text-orange-500">Lens</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">
            Local Read-Only AWS FinOps & Cost Intelligence
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Read-Only Safety Enforced</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-orange-500" />
              <span>Sign In to Dashboard</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authenticate locally to access billing breakdowns and cloud resource telemetry.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Default Credentials Callout */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Default Quick-Start Credentials</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Username: <span className="font-mono text-slate-200 font-semibold bg-slate-800 px-1.5 py-0.5 rounded">admin</span>
              {' '}| Password:{' '}
              <span className="font-mono text-slate-200 font-semibold bg-slate-800 px-1.5 py-0.5 rounded">admin123</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Configurable via <span className="font-mono">APP_ADMIN_USER</span> and <span className="font-mono">APP_ADMIN_PASSWORD</span> in your local <span className="font-mono">.env</span> file.
            </div>
          </div>
        </div>

        {/* Security Reassurance Footer */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>AWS credentials stored strictly server-side</span>
          </div>
          <div className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            Zero mutation APIs: Cannot start, stop, create, delete, or alter any AWS cloud resource.
          </div>
        </div>
      </div>
    </div>
  );
};
