import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import RiskMeter from '../components/RiskMeter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldExclamationIcon, 
  LockClosedIcon, 
  BoltIcon, 
  CpuChipIcon, 
  ClockIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const PrivilegedActivity = () => {
  const { token, addToast } = useAuth();

  // Simulation Form States
  const [simUser, setSimUser] = useState('db_admin');
  const [simCommand, setSimCommand] = useState('DROP DATABASE customer_records CASCADE;');
  const [simHour, setSimHour] = useState(14);
  const [simFailedLogins, setSimFailedLogins] = useState(0);
  const [simVpn, setSimVpn] = useState(false);
  const [simDeviceChange, setSimDeviceChange] = useState(false);
  const [simCountryChange, setSimCountryChange] = useState(false);
  const [simDownloadedFiles, setSimDownloadedFiles] = useState(0);

  // Simulation Response/Result States
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaCodeInput, setMfaCodeInput] = useState('');

  // Privileged Logs State
  const [privLogs, setPrivLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Seed Users
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPrivLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrivLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPrivLogs();
  }, []);

  const runSimulation = async (e) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);
    try {
      const params = new URLSearchParams({
        username: simUser,
        login_hour: simHour.toString(),
        vpn: simVpn.toString(),
        command: simCommand,
        failed_logins: simFailedLogins.toString(),
        downloaded_files: simDownloadedFiles.toString(),
        device_change: simDeviceChange.toString(),
        country_change: simCountryChange.toString()
      });

      const res = await fetch(`${API_URL}/risk/evaluate?${params.toString()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
        
        // Dynamic toast response feedback
        if (data.action_taken === 'LockAccount') {
          addToast("SYSTEM LOCKDOWN", `User ${simUser} blocked due to critical risk score (${data.risk_score}%). Incident generated: ${data.incident_number}.`, "High");
        } else if (data.action_taken === 'RequireMFA') {
          addToast("MFA ESCALATION", `Privileged command held. Prompting user ${simUser} for step-up MFA challenge.`, "Medium");
          setShowMfaModal(true);
        } else {
          addToast("Execution Tracked", `Action logged. Model Anomaly Verdict: ${data.anomaly_verdict} (Confidence: ${Math.round(data.confidence * 100)}%)`, "Info");
        }
        // Refresh logs list
        fetchPrivLogs();
      }
    } catch (err) {
      console.error(err);
      addToast("Sim Error", "Simulation execution pipeline failed.", "High");
    } finally {
      setSimulating(false);
    }
  };

  const getSeverity = (score) => {
    if (score >= 80) return { text: 'HIGH', class: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    if (score >= 40) return { text: 'MEDIUM', class: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    return { text: 'LOW', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  };

  const handleMfaSubmit = (e) => {
    e.preventDefault();
    if (mfaCodeInput === '123456') {
      addToast("MFA Cleared", "Verification successful. Privileged execution completed.", "Info");
      setShowMfaModal(false);
      setMfaCodeInput('');
    } else {
      addToast("MFA Mismatch", "Incorrect simulated verification passcode entered.", "High");
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Page Title */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          PRIVILEGED ACTIVITY AUDIT & SIMULATION
        </h2>
        <p className="text-xs text-slate-400">Review critical administrative banking actions and simulate insider threat scenarios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Simulation Console */}
        <div className="lg:col-span-1">
          <GlassCard className="h-full border-indigo-500/20" glowColor="blue">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4 flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-cyan-400" /> Threat Simulator Console
            </h3>
            
            <form onSubmit={runSimulation} className="space-y-4 text-xs font-mono">
              {/* User Selection */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-bold">Target Identity</label>
                <div className="relative">
                  <select
                    value={simUser}
                    onChange={(e) => setSimUser(e.target.value)}
                    className="w-full appearance-none glass-input text-slate-200 cursor-pointer pr-10 py-1.5"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.username} className="bg-slate-950 text-slate-200">
                        {u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Command Selection */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-bold">Privileged Command Action</label>
                <div className="relative">
                  <select
                    value={simCommand}
                    onChange={(e) => setSimCommand(e.target.value)}
                    className="w-full appearance-none glass-input text-slate-200 cursor-pointer pr-10 py-1.5"
                  >
                    <option value="DROP DATABASE customer_records CASCADE;" className="bg-slate-950 text-slate-200">DROP DATABASE customer_records</option>
                    <option value="RESET password FOR USER db_admin;" className="bg-slate-950 text-slate-200">RESET password FOR USER db_admin</option>
                    <option value="CREATE USER threat_hunter WITH SUPERUSER;" className="bg-slate-950 text-slate-200">CREATE USER WITH SUPERUSER</option>
                    <option value="iptables -A INPUT -p tcp --dport 22 -j DROP; # Modify Firewall" className="bg-slate-950 text-slate-200">Modify Firewall Rules</option>
                    <option value="DOWNLOAD FROM S3 bucket 'customer_PII_export_large';" className="bg-slate-950 text-slate-200">Download Customer PII Vault</option>
                    <option value="CHMOD 777 /etc/ssl/certs/banking_private_key.pem;" className="bg-slate-950 text-slate-200">Chmod TLS Private Keys</option>
                    <option value="SELECT * FROM ledger_summary WHERE date='today';" className="bg-slate-950 text-slate-200">Normal Query Ledger (Low Risk)</option>
                  </select>
                  <ChevronDownIcon className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Slider for Hours */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="font-bold">Access Hour (24h)</span>
                  <span className="text-cyan-400 font-bold">{simHour}:00</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={simHour}
                  onChange={(e) => setSimHour(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider for Failed Logins */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="font-bold">Prior Failed Logins</span>
                  <span className="text-cyan-400 font-bold">{simFailedLogins} times</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={simFailedLogins}
                  onChange={(e) => setSimFailedLogins(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Numeric Input for Downloads */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-bold">Downloaded Files Count</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={simDownloadedFiles}
                  onChange={(e) => setSimDownloadedFiles(parseInt(e.target.value) || 0)}
                  className="w-full glass-input py-1 text-xs font-mono text-slate-200"
                />
              </div>

              {/* Checkbox triggers */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 text-[10px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={simVpn}
                    onChange={(e) => setSimVpn(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 h-3.5 w-3.5"
                  />
                  <span>VPN Pipe</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={simCountryChange}
                    onChange={(e) => setSimCountryChange(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 h-3.5 w-3.5"
                  />
                  <span>New Country</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={simDeviceChange}
                    onChange={(e) => setSimDeviceChange(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 h-3.5 w-3.5"
                  />
                  <span>New Mac</span>
                </label>
              </div>

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={simulating}
                className="w-full mt-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 shadow-neon-blue"
              >
                {simulating ? (
                  <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <span>Inject Command</span>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Real-time simulation feedback display / results panel */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
          {/* Anomaly verdict display */}
          <GlassCard className="flex-grow flex flex-col items-center justify-center p-6 border-white/5 relative min-h-[300px]">
            {simResult ? (
              <div className="w-full flex flex-col items-center text-center space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">Simulated Endpoint Result</h4>
                
                <div className="flex flex-col md:flex-row items-center gap-8 justify-center w-full max-w-lg">
                  {/* Gauge */}
                  <RiskMeter score={simResult.risk_score} size={130} />
                  
                  {/* ML prediction metadata */}
                  <div className="space-y-3 font-mono text-left text-xs text-slate-300 bg-white/[0.02] p-4 rounded-xl border border-white/5 flex-grow">
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">AI Verdict</span>
                      <strong className="text-white text-sm flex items-center gap-1.5 mt-0.5">
                        <CpuChipIcon className="h-4 w-4 text-purple-400" /> {simResult.anomaly_verdict}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Prediction Confidence</span>
                      <strong className="text-white">{Math.round(simResult.confidence * 100)}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Automated Mitigation Response</span>
                      <strong className={`block mt-0.5 px-2 py-0.5 rounded text-[10px] w-fit font-bold uppercase border ${
                        simResult.action_taken === 'LockAccount' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                          : simResult.action_taken === 'RequireMFA' 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {simResult.action_taken === 'LockAccount' && "Lock Account & Issue Incident"}
                        {simResult.action_taken === 'RequireMFA' && "Stepped-Up MFA Verification"}
                        {simResult.action_taken === 'Logged' && "Telemetry Logged to Audit Trail"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Account status notification */}
                {simResult.account_locked && (
                  <div className="p-3.5 w-full max-w-lg rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex gap-2.5 items-center font-mono text-left animate-pulse">
                    <ShieldExclamationIcon className="h-6 w-6 flex-shrink-0" />
                    <div>
                      <strong>Account status: LOCKED OUT.</strong> Generated compliance incident: <strong>{simResult.incident_number}</strong>. Authentication keys revoked.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 font-mono text-center max-w-md space-y-3">
                <CpuChipIcon className="h-10 w-10 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs leading-relaxed">
                  Configure threat features in the simulator panel and click <strong>Inject Command</strong> to verify system risk responses and Isolation Forest anomaly prediction vectors.
                </p>
              </div>
            )}
          </GlassCard>

          {/* Audit trail summary table */}
          <GlassCard className="p-0 overflow-hidden" delay={0.1}>
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">Privileged Shell Audit Stream</h4>
              <span className="text-[10px] text-slate-500 font-mono">Recent operations</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] uppercase font-mono tracking-wider text-slate-400 bg-white/[0.01]">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4">Command</th>
                    <th className="py-2.5 px-4 text-center">Severity</th>
                    <th className="py-2.5 px-4 text-center">Risk</th>
                    <th className="py-2.5 px-4 text-center">AI Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-[11px] font-mono text-slate-300">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">Retrieving audit telemetry...</td>
                    </tr>
                  ) : privLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">No privileged activity logs detected in DB.</td>
                    </tr>
                  ) : (
                    privLogs.map((log) => {
                      const severity = getSeverity(log.risk_score);
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-2.5 px-4 text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-100">{log.username}</td>
                          <td className="py-2.5 px-4 max-w-[200px] truncate text-slate-200 font-bold" title={log.command}>
                            {log.command}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold ${severity.class}`}>
                              {severity.text}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-300">{log.risk_score}%</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold ${
                              log.anomaly_verdict === 'High Risk' ? 'text-red-400' : log.anomaly_verdict === 'Suspicious' ? 'text-amber-400' : 'text-slate-500'
                            }`}>
                              {log.anomaly_verdict}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Pop-up Step-up MFA Simulation Modal */}
      <AnimatePresence>
        {showMfaModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-glass border-amber-500/30"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
                  <LockClosedIcon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold font-mono text-white">STEP-UP AUTHORIZATION CHALLENGE</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  The action you attempted exceeds risk thresholds (score &gt;80%). Please confirm your authorization credentials.
                </p>
                <div className="text-[10px] font-mono text-slate-500 bg-white/[0.01] p-1.5 rounded border border-white/5">
                  Simulated Code: <strong className="text-cyan-400">123456</strong>
                </div>

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="Enter 123456"
                    value={mfaCodeInput}
                    onChange={(e) => setMfaCodeInput(e.target.value)}
                    className="w-full tracking-[1em] text-center font-mono text-base glass-input"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMfaModal(false);
                        setMfaCodeInput('');
                        addToast("Command Cancelled", "Privileged execution aborted by security team.", "Medium");
                      }}
                      className="w-1/2 py-2 rounded-lg border border-white/10 text-slate-300 text-xs font-mono uppercase hover:bg-white/5 transition-colors"
                    >
                      Abort
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase transition-colors"
                    >
                      Authorize
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrivilegedActivity;
