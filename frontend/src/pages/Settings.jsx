import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  Cog6ToothIcon, 
  UserGroupIcon, 
  ArrowPathIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { token, user, addToast } = useAuth();

  // Settings States
  const [usersList, setUsersList] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Loader states
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [resettingDb, setResettingDb] = useState(false);

  // Policy form inputs
  const [mfaThreshold, setMfaThreshold] = useState('80');
  const [lockThreshold, setLockThreshold] = useState('95');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
        
        // Sync values
        const mfaP = data.find(p => p.name === 'RISK_THRESHOLD_HIGH');
        const lockP = data.find(p => p.name === 'RISK_THRESHOLD_LOCKOUT');
        if (mfaP) setMfaThreshold(mfaP.value);
        if (lockP) setLockThreshold(lockP.value);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPolicies();
    fetchAuditLogs();
  }, []);

  const handleUpdatePolicy = async (name, val) => {
    if (user.role !== 'Super Admin') {
      addToast("Unauthorized Action", "Only Super Admins can alter active security parameters.", "High");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/settings/policies/${name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ value: val })
      });
      if (res.ok) {
        addToast("Policy Updated", `Policy '${name}' configured to ${val}%.`, "Info");
        fetchPolicies();
        fetchAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLockUnlockUser = async (username, isLocked) => {
    const action = isLocked ? 'unlock' : 'lock';
    try {
      const res = await fetch(`${API_URL}/users/${username}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast("User Lock Status Change", `User '${username}' marked as ${isLocked ? 'Active' : 'Locked'}.`, "Info");
        fetchUsers();
        fetchAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetAndReseedDatabase = async () => {
    if (user.role !== 'Super Admin') {
      addToast("Unauthorized Action", "Database reseeding restricted to Super Admin role.", "High");
      return;
    }
    setResettingDb(true);
    addToast("Database Reset", "Deleting SQLite logs, generating 10,000 records, and retraining ML Model...", "Info");
    
    try {
      const res = await fetch(`${API_URL}/settings/reset-database`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast("Database Restored", "Telemetry seed process and ML training finished successfully.", "Info");
        fetchUsers();
        fetchPolicies();
        fetchAuditLogs();
      } else {
        const err = await res.json();
        addToast("Reset Failure", err.detail || "Database reset script aborted.", "High");
      }
    } catch (e) {
      console.error(e);
      addToast("Reset Failure", "Database reset script network connection lost.", "High");
    } finally {
      setResettingDb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          SYSTEM PARAMETERS & POLICIES
        </h2>
        <p className="text-xs text-slate-400">Configure risk limits, provision user lockouts, review diagnostics, and sync databases.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Lockouts Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Management List */}
          <GlassCard className="p-0 overflow-hidden" delay={0.05}>
            <div className="px-5 py-4 border-b border-white/5 bg-slate-950/40">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-cyan-400" /> Administrative Accounts provisioning
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] uppercase font-mono tracking-wider text-slate-400 bg-white/[0.01]">
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Lockout Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs font-mono text-slate-300">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">Loading user profiles...</td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-100">{u.username}</td>
                        <td className="py-3 px-4">{u.role}</td>
                        <td className="py-3 px-4 text-slate-400">{u.department || 'N/A'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            u.status === 'Locked' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleLockUnlockUser(u.username, u.status === 'Locked')}
                            disabled={user.username === u.username} // Can't lock yourself
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${
                              u.status === 'Locked'
                                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/40'
                                : 'bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/40'
                            } disabled:opacity-20 disabled:pointer-events-none`}
                          >
                            {u.status === 'Locked' ? 'Unlock Account' : 'Lock Account'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Audit Logs */}
          <GlassCard className="p-0 overflow-hidden" delay={0.1}>
            <div className="px-5 py-4 border-b border-white/5 bg-slate-950/40 flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                System Diagnostics & Security Audit Logs
              </h3>
              <button 
                onClick={fetchAuditLogs}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] uppercase font-mono tracking-wider text-slate-400 bg-white/[0.01]">
                    <th className="py-2 px-4">Timestamp</th>
                    <th className="py-2 px-4">Actor</th>
                    <th className="py-2 px-4">Action</th>
                    <th className="py-2 px-4">Detail</th>
                    <th className="py-2 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-[10px] font-mono text-slate-400">
                  {loadingAudits ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">Loading audit trail...</td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">No logs registered.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-2 px-4 text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-4 font-semibold text-slate-300">{log.user}</td>
                        <td className="py-2 px-4 font-bold text-slate-300">{log.action}</td>
                        <td className="py-2 px-4 max-w-[200px] truncate" title={log.description}>{log.description}</td>
                        <td className="py-2 px-4 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            log.status === 'Success' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Security Parameters Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard glowColor="purple" delay={0.15}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4 flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5 text-purple-400" /> Active Security Policies
            </h3>
            
            <div className="space-y-6 font-mono text-xs">
              {/* Slider for MFA risk boundary */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">MFA Step-up Limit</span>
                  <span className="text-purple-400 font-bold">{mfaThreshold}% Risk</span>
                </div>
                <input
                  type="range" min="50" max="90" value={mfaThreshold}
                  onChange={(e) => setMfaThreshold(e.target.value)}
                  onMouseUp={() => handleUpdatePolicy('RISK_THRESHOLD_HIGH', mfaThreshold)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <span className="text-[10px] text-slate-500 block">Actions exceeding this limit require passcode confirmation.</span>
              </div>

              {/* Slider for Automatic user lockout limit */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">Auto Lockout Limit</span>
                  <span className="text-purple-400 font-bold">{lockThreshold}% Risk</span>
                </div>
                <input
                  type="range" min="80" max="99" value={lockThreshold}
                  onChange={(e) => setLockThreshold(e.target.value)}
                  onMouseUp={() => handleUpdatePolicy('RISK_THRESHOLD_LOCKOUT', lockThreshold)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <span className="text-[10px] text-slate-500 block">Transactions exceeding this limit trigger lockdowns and generate tickets.</span>
              </div>
            </div>
          </GlassCard>

          {/* Database Reset Operations */}
          <GlassCard delay={0.2} className="border-red-500/20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400 font-mono mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" /> Administrative Diagnostics
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono mb-4">
              Resets active logs, wipes sessions, rebuilds schema profiles, recreates default key pairs, and fits the Isolation Forest model on 10,000 fresh records.
            </p>
            
            <button
              onClick={resetAndReseedDatabase}
              disabled={resettingDb}
              className="w-full py-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono uppercase tracking-wider font-bold transition-all duration-300 flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white"
            >
              {resettingDb ? (
                <>
                  <div className="h-4 w-4 border-2 border-t-transparent border-red-400 rounded-full animate-spin"></div>
                  <span>Reseeding Pipeline...</span>
                </>
              ) : (
                <span>Re-Seed DB & Train ML Model</span>
              )}
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Settings;
