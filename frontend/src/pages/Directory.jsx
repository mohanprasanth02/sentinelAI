import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  UsersIcon, 
  LockClosedIcon, 
  LockOpenIcon, 
  NoSymbolIcon, 
  ArrowPathIcon,
  KeyIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Directory = () => {
  const { token, addToast } = useAuth();
  
  // Data States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Privileged User');
  const [newDept, setNewDept] = useState('IT Infrastructure');
  const [creatingUser, setCreatingUser] = useState(false);

  // Detail Alert Modal (for PQC credential reset feedback)
  const [resetFeedback, setResetFeedback] = useState(null);

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/users/directory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
      addToast("Connection Error", "Failed to retrieve active directory records.", "High");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          department: newDept
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast("Profile Created", `User '${newUsername}' has been provisioned successfully.`, "Info");
        setShowAddModal(false);
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        addToast("Provisioning Failed", data.detail || "Error creating profile.", "High");
      }
    } catch (err) {
      console.error(err);
      addToast("Network Error", "Unable to contact directory provisioning services.", "High");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleLockUnlock = async (username, isLock) => {
    const action = isLock ? 'lock' : 'unlock';
    try {
      const res = await fetch(`${API_URL}/users/${username}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast(
          isLock ? "Lockout Applied" : "Access Restored",
          `User '${username}' status updated. Active session tokens revoked.`,
          isLock ? "High" : "Info"
        );
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTerminateSessions = async (username) => {
    try {
      const res = await fetch(`${API_URL}/users/${username}/terminate-sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast("Sessions Revoked", `Terminated all active session tunnels for '${username}'.`, "Info");
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPqc = async (username) => {
    try {
      const res = await fetch(`${API_URL}/users/${username}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResetFeedback({
          username,
          message: data.message
        });
        addToast("Key Roll Complete", `Cryptographic secrets rolled for user ${username}.`, "Info");
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculations
  const totalUsers = users.length;
  const lockedUsers = users.filter(u => u.status === 'Locked').length;
  const activeSessions = users.reduce((sum, u) => sum + u.active_sessions, 0);
  const privilegedCount = users.filter(u => u.role === 'Privileged User').length;

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleStyle = (role) => {
    if (role === 'Super Admin') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (role === 'Security Analyst') return 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-white/5 rounded"></div>
          <div className="h-10 w-24 bg-white/5 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-white/5 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            ACTIVE DIRECTORY & LOCKOUT CONTROLS
          </h2>
          <p className="text-xs text-slate-400">Revoke active sessions, lock out users, and reset quantum cryptography keys.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/5 transition-all duration-200"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white uppercase tracking-wider transition-all duration-200"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard glowColor="blue">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Staff</p>
              <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalUsers}</h3>
            </div>
            <UsersIcon className="h-5 w-5 text-slate-500" />
          </div>
        </GlassCard>

        <GlassCard glowColor="red">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounts Locked</p>
              <h3 className="text-2xl font-bold font-mono text-red-400 mt-1">{lockedUsers}</h3>
            </div>
            <NoSymbolIcon className="h-5 w-5 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard glowColor="cyan">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Sessions</p>
              <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-1">{activeSessions}</h3>
            </div>
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-cyan-400" />
          </div>
        </GlassCard>

        <GlassCard glowColor="purple">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privileged Staff</p>
              <h3 className="text-2xl font-bold font-mono text-purple-400 mt-1">{privilegedCount}</h3>
            </div>
            <KeyIcon className="h-5 w-5 text-purple-400" />
          </div>
        </GlassCard>
      </div>

      {/* Search and Table section */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Controls Bar */}
        <div className="px-5 py-4 border-b border-white/5 bg-slate-950/40 flex flex-col md:flex-row gap-4 justify-between items-center">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">System Directory Registers</h4>
          <input
            type="text"
            placeholder="Filter by Username, Department, or Role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80 px-4 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] uppercase font-mono tracking-wider text-slate-400 bg-white/[0.01]">
                <th className="py-3 px-5">Staff Member</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Role Permission</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-center">Active Sessions</th>
                <th className="py-3 px-5">PQC Status</th>
                <th className="py-3 px-5 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-xs font-mono text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">No matching staff accounts detected in directory database.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* User Details */}
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-100">{u.username}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Created {new Date(u.created_at).toLocaleDateString()}</div>
                    </td>
                    
                    {/* Department */}
                    <td className="py-3 px-5 text-slate-200">{u.department || 'General Ops'}</td>
                    
                    {/* Role */}
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${getRoleStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td className="py-3 px-5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        u.status === 'Locked' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    
                    {/* Active Sessions */}
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.active_sessions > 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-600'
                      }`}>
                        {u.active_sessions > 0 && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
                        {u.active_sessions} Active
                      </span>
                    </td>

                    {/* PQC status */}
                    <td className="py-3 px-5 max-w-[120px] truncate text-slate-500" title={u.kyber_pk ? "Kyber-768 Keys Registered" : "Keys Revoked"}>
                      {u.kyber_pk ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheckIcon className="h-4 w-4" /> Kyber-768
                        </span>
                      ) : (
                        <span className="text-slate-500">Unencrypted</span>
                      )}
                    </td>

                    {/* Action Controls */}
                    <td className="py-3 px-5 text-right space-x-1.5">
                      {/* Lock / Unlock */}
                      {u.status === 'Locked' ? (
                        <button
                          onClick={() => handleLockUnlock(u.username, false)}
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded text-[10px] uppercase font-bold transition-all duration-200 cursor-pointer"
                        >
                          Unlock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLockUnlock(u.username, true)}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded text-[10px] uppercase font-bold transition-all duration-200 cursor-pointer"
                        >
                          Lock
                        </button>
                      )}

                      {/* Terminate Session */}
                      <button
                        onClick={() => handleTerminateSessions(u.username)}
                        disabled={u.active_sessions === 0}
                        className="px-2 py-1 border border-white/10 hover:border-white/20 text-slate-300 hover:bg-white/5 rounded text-[10px] uppercase font-bold disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                      >
                        Kill Pipes
                      </button>

                      {/* Reset Key */}
                      <button
                        onClick={() => handleResetPqc(u.username)}
                        className="p-1 border border-cyan-500/20 hover:border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded inline-flex items-center justify-center transition-all duration-200 cursor-pointer"
                        title="Roll Credentials & Regenerate Kyber-768 Keys"
                      >
                        <KeyIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Provision User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-glass border-white/10 relative">
            <h3 className="text-base font-bold font-mono tracking-widest text-white uppercase border-b border-white/5 pb-2.5 mb-4">
              Provision New Security Profile
            </h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 text-[10px] uppercase block">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ops_analyst"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-[10px] uppercase block">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="********"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-[10px] uppercase block">Role Permission</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500/50"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="Privileged User">Privileged User</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-[10px] uppercase block">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-cyan-500/50"
                >
                  <option value="IT Infrastructure">IT Infrastructure</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Treasury">Treasury</option>
                  <option value="Security Operations">Security Operations</option>
                </select>
              </div>

              <div className="flex gap-2 border-t border-white/5 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-lg border border-white/10 text-slate-400 uppercase tracking-wider font-bold hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-1/2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white uppercase tracking-wider font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creatingUser ? "Provisioning..." : "Initialize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credential Feedback Alert Modal */}
      {resetFeedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl shadow-glass border-cyan-500/30 relative text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <KeyIcon className="h-8 w-8 animate-bounce" />
            </div>
            
            <h3 className="text-base font-bold font-mono tracking-widest text-white uppercase">
              Quantum Key Roll Complete
            </h3>
            
            <p className="text-xs font-mono text-slate-300 leading-relaxed text-left bg-black/35 p-3 rounded-lg border border-white/5">
              {resetFeedback.message}
            </p>
            
            <div className="border-t border-white/5 pt-4 mt-6">
              <button
                onClick={() => setResetFeedback(null)}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Directory;
