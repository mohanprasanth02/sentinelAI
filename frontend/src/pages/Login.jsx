import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheckIcon, KeyIcon, UserIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Demo Helper State
  const [selectedRoleOption, setSelectedRoleOption] = useState('');

  const handleRoleSelection = (role) => {
    setSelectedRoleOption(role);
    if (role === 'admin') {
      setUsername('admin_sec');
      setPassword('password123');
    } else if (role === 'analyst') {
      setUsername('analyst_01');
      setPassword('password123');
    } else if (role === 'privileged') {
      setUsername('db_admin');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(username, password, mfaRequired ? mfaCode : null);
      if (res && res.mfaRequired) {
        setMfaRequired(true);
      } else if (res && res.success) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background visual overlays */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-white/5 text-white border border-white/10 shadow-glass mb-4">
            <ShieldCheckIcon className="h-10 w-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SentinelAI SOC Portal
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Privileged Access & Insider Threat Detection Console
          </p>
        </div>

        {/* Glassmorphic Login Form */}
        <div className="glass-panel rounded-2xl p-8 shadow-glass border-white/10 relative overflow-hidden">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex gap-2.5 items-center font-mono">
                <ShieldExclamationIcon className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!mfaRequired ? (
              <>
                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Security Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-5 w-5 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Username (e.g. admin_sec)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 glass-input focus:border-cyan-400/40"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Security PIN / Password
                  </label>
                  <div className="relative">
                    <KeyIcon className="absolute left-3.5 top-3 h-5 w-5 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 glass-input focus:border-cyan-400/40"
                    />
                  </div>
                </div>

                {/* Quick Selection Shortcuts (Essential for demonstration) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Demo Role Profiles
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleSelection('admin')}
                      className={`text-[10px] py-2 rounded-lg border font-mono transition-colors font-bold ${
                        selectedRoleOption === 'admin'
                          ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-neon-blue'
                          : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelection('analyst')}
                      className={`text-[10px] py-2 rounded-lg border font-mono transition-colors font-bold ${
                        selectedRoleOption === 'analyst'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-neon-blue'
                          : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      SOC Analyst
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelection('privileged')}
                      className={`text-[10px] py-2 rounded-lg border font-mono transition-colors font-bold ${
                        selectedRoleOption === 'privileged'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-neon-blue'
                          : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      Privileged
                    </button>
                  </div>
                </div>

                {/* Form Options */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20"
                    />
                    <span>Remember terminal</span>
                  </label>
                  <a href="#forgot" onClick={(e) => {e.preventDefault(); alert("SOC Reset policy: Contact IT helpdesk for offline hardware token resets.")}} className="hover:text-cyan-400 transition-colors">
                    Forgot Token?
                  </a>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-neon-blue flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Initialize Session</span>
                  )}
                </button>
              </>
            ) : (
              /* MFA Simulation Modal */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-900/30 px-3 py-1 rounded-full border border-cyan-400/20 font-mono tracking-widest uppercase">
                    MFA CHALLENGE REQUIRED
                  </span>
                  <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                    Verify authentication via simulated secure token. Please enter the generated banking authorization passcode.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-slate-500 bg-white/[0.02] p-1.5 rounded border border-white/5">
                    Demo Code: <strong className="text-amber-400">123456</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    6-Digit Verification Token
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full tracking-[1em] text-center font-mono text-lg glass-input focus:border-cyan-400/40"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaRequired(false);
                      setMfaCode('');
                      setError('');
                    }}
                    className="w-1/3 py-3 rounded-lg border border-white/10 text-slate-300 text-xs font-mono uppercase hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 py-3 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-neon-blue flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
