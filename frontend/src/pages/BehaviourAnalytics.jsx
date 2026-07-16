import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  UserIcon, 
  MapPinIcon, 
  DevicePhoneMobileIcon, 
  CommandLineIcon, 
  ClockIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';

const BehaviourAnalytics = () => {
  const { token, addToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUser = searchParams.get('user');

  // Page States
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch all users to populate the picker dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
          
          // Determine initial selected user (Query param > first employee)
          if (queryUser) {
            setSelectedUser(queryUser);
          } else if (data.length > 0) {
            setSelectedUser(data[0].username);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchEmployees();
  }, [queryUser]);

  // Fetch user behavior profile telemetry
  const fetchUserProfile = async (username) => {
    if (!username) return;
    setLoading(true);
    try {
      // Get all logs for this user to compute comparison profiles
      const res = await fetch(`${API_URL}/logs?username=${username}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const userLogs = data.logs;
        
        if (userLogs.length === 0) {
          setProfileData(null);
          setLoading(false);
          return;
        }

        // 1. Core Profile Details (simulate baselines)
        // Find most frequent location, device, hour
        const locationCounts = {};
        const deviceCounts = {};
        const hourCounts = {};
        let totalCmds = 0;
        
        userLogs.forEach(l => {
          locationCounts[l.location] = (locationCounts[l.location] || 0) + 1;
          deviceCounts[l.device] = (deviceCounts[l.device] || 0) + 1;
          hourCounts[l.login_hour] = (hourCounts[l.login_hour] || 0) + 1;
          if (l.command) totalCmds += 1;
        });

        const getTopKey = (obj) => Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b, "");
        
        const baselineLocation = getTopKey(locationCounts);
        const baselineDevice = getTopKey(deviceCounts);
        const baselineHour = getTopKey(hourCounts);
        const avgCommands = Math.round(totalCmds / userLogs.length) || 1;

        // Current session details (take the most recent log)
        const currentLog = userLogs[0];
        
        // Formulate user profile payload
        setProfileData({
          username: username,
          department: currentLog.department || "Treasury",
          role: currentLog.role,
          baselines: {
            normal_login_hour: baselineHour && baselineHour !== 'undefined' && baselineHour !== 'null' ? `${baselineHour}:00` : '12:00',
            known_location: baselineLocation || 'US Office',
            known_device: baselineDevice || 'Standard Workstation',
            avg_commands: avgCommands
          },
          current: {
            login_time: new Date(currentLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            login_hour: currentLog.login_hour,
            location: currentLog.location,
            ip: currentLog.ip_address,
            device: currentLog.device,
            vpn: currentLog.vpn,
            commands_count: userLogs.filter(l => {
              // count commands in logs from today (simulated as past 24 hours of logs)
              const timeDiff = Date.now() - new Date(l.timestamp).getTime();
              return timeDiff < (24 * 3600 * 1000) && l.command;
            }).length
          },
          logs: userLogs.slice(0, 15) // last 15 actions
        });
      }
    } catch (e) {
      console.error(e);
      addToast("Profile Load Error", "Failed to retrieve employee profile data.", "High");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchUserProfile(selectedUser);
      // Synchronize search params to matching user
      setSearchParams({ user: selectedUser });
    }
  }, [selectedUser]);

  // Risk Trend Line Chart configs
  const reverseLogs = profileData ? [...profileData.logs].reverse() : [];
  const chartLabels = reverseLogs.map((_, i) => `S-${i+1}`);
  const chartDataPoints = reverseLogs.map(l => l.risk_score);

  const trendData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Session Risk Index',
        data: chartDataPoints,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.04)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#a855f7',
      }
    ]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#71717a', font: { family: 'JetBrains Mono', size: 9 } } },
      y: { 
        grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
        ticks: { color: '#71717a', font: { family: 'JetBrains Mono', size: 9 } },
        min: 0,
        max: 100
      }
    }
  };

  const isAnomalous = (current, baseline) => current !== baseline;

  return (
    <div className="space-y-6">
      {/* Selector header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            USER BEHAVIOUR ANALYTICS (UBA)
          </h2>
          <p className="text-xs text-slate-400">Employee behavior baseline profiling and anomalous deviation assessment.</p>
        </div>
        
        {/* User Picker Selection */}
        <div className="relative">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="appearance-none glass-input pr-10 py-2 text-xs font-mono font-bold cursor-pointer text-cyan-400 min-w-[200px]"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.username} className="bg-slate-950 text-slate-200">
                {emp.username} ({emp.role})
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3.5 top-3 h-4 w-4 text-cyan-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 bg-white/5 rounded-2xl lg:col-span-2"></div>
            <div className="h-80 bg-white/5 rounded-2xl"></div>
          </div>
        </div>
      ) : !profileData ? (
        <GlassCard className="text-center py-16">
          <p className="text-slate-400 text-sm">No activity logs recorded for user "{selectedUser}" to compile profile data.</p>
        </GlassCard>
      ) : (
        <>
          {/* Baseline vs Current Session Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Hour comparison */}
            <GlassCard className="p-5 flex flex-col justify-between" delay={0.05}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold tracking-wider uppercase">Login Hour</span>
                <ClockIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-slate-400 block font-mono">Baseline: {profileData.baselines.normal_login_hour}</span>
                <span className="text-xl font-bold font-mono text-white block mt-1">Today: {profileData.current.login_time}</span>
              </div>
              <div className="mt-3">
                {isAnomalous(profileData.current.login_hour, parseInt(profileData.baselines.normal_login_hour)) ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                    <ShieldExclamationIcon className="h-3 w-3" /> Off-hours access
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <ShieldCheckIcon className="h-3 w-3" /> Within normal hours
                  </span>
                )}
              </div>
            </GlassCard>

            {/* Location comparison */}
            <GlassCard className="p-5 flex flex-col justify-between" delay={0.1}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold tracking-wider uppercase">IP Geolocation</span>
                <MapPinIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-slate-400 block font-mono">Baseline: {profileData.baselines.known_location}</span>
                <span className="text-xl font-bold font-mono text-white block mt-1 truncate" title={profileData.current.location}>
                  Today: {profileData.current.location}
                </span>
              </div>
              <div className="mt-3">
                {isAnomalous(profileData.current.location, profileData.baselines.known_location) ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 inline-flex items-center gap-1">
                    <ShieldExclamationIcon className="h-3 w-3" /> Location Change
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <ShieldCheckIcon className="h-3 w-3" /> Standard Country
                  </span>
                )}
              </div>
            </GlassCard>

            {/* Device comparison */}
            <GlassCard className="p-5 flex flex-col justify-between" delay={0.15}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold tracking-wider uppercase">Workstation device</span>
                <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-slate-400 block font-mono">Baseline: {profileData.baselines.known_device.split(" ")[0]}</span>
                <span className="text-xl font-bold font-mono text-white block mt-1 truncate" title={profileData.current.device}>
                  Today: {profileData.current.device}
                </span>
              </div>
              <div className="mt-3">
                {isAnomalous(profileData.current.device, profileData.baselines.known_device) ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                    <ShieldExclamationIcon className="h-3 w-3" /> Unknown MAC/Device
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <ShieldCheckIcon className="h-3 w-3" /> Known Workstation
                  </span>
                )}
              </div>
            </GlassCard>

            {/* Command count comparison */}
            <GlassCard className="p-5 flex flex-col justify-between" delay={0.2}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold tracking-wider uppercase">Sudo / Cmd Activity</span>
                <CommandLineIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-slate-400 block font-mono">Baseline Avg: {profileData.baselines.avg_commands} cmds</span>
                <span className="text-xl font-bold font-mono text-white block mt-1">Today: {profileData.current.commands_count} cmds</span>
              </div>
              <div className="mt-3">
                {profileData.current.commands_count > (profileData.baselines.avg_commands * 2.5) ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 inline-flex items-center gap-1">
                    <ShieldExclamationIcon className="h-3 w-3" /> Exec Spurt (High)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <ShieldCheckIcon className="h-3 w-3" /> Safe Exec Rate
                  </span>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Risk Graph trend vs Activity Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk trend graph */}
            <GlassCard className="lg:col-span-2 flex flex-col justify-between h-96" delay={0.25}>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">Profile Risk Index Trajectory</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Calculated across user's last 15 active sessions</p>
              </div>
              <div className="flex-grow min-h-0 mt-4">
                <Line data={trendData} options={trendOptions} />
              </div>
            </GlassCard>

            {/* Profile Summary Card */}
            <GlassCard className="flex flex-col justify-between h-96" delay={0.3}>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4">Security Profile</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <div className="p-2 bg-indigo-500/10 rounded text-cyan-400">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">IDENTITY ID</span>
                      <span className="text-xs font-bold text-white block font-mono">{profileData.username}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">DEPARTMENT</span>
                      <span className="text-xs font-semibold text-slate-200 font-sans mt-0.5 block">{profileData.department}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">SECURITY ROLE</span>
                      <span className="text-xs font-semibold text-slate-200 font-sans mt-0.5 block">{profileData.role}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">Primary Country</span>
                      <span className="text-slate-200 font-sans">{profileData.baselines.known_location}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">VPN Session Rate</span>
                      <span className="text-slate-200">
                        {Math.round((profileData.logs.filter(l => l.vpn).length / profileData.logs.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex gap-2.5 items-center">
                <ShieldCheckIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed text-slate-400 font-mono">
                  Base metrics are derived dynamically from standard historical activity log deviations.
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Behaviour Audit Timeline */}
          <GlassCard delay={0.35}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-6">User Audit Command History</h4>
            <div className="relative pl-6 border-l border-white/10 space-y-8">
              {profileData.logs.map((log, index) => (
                <div key={log.id} className="relative">
                  {/* Timeline circle dot */}
                  <span className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border ${
                    log.risk_score >= 80 
                      ? 'bg-red-500 border-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]' 
                      : log.risk_score >= 40 
                        ? 'bg-amber-500 border-amber-500' 
                        : 'bg-indigo-500 border-indigo-500'
                  }`}></span>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString()} from {log.location} ({log.ip_address})
                      </span>
                      <h5 className="text-xs font-mono font-bold text-slate-200 mt-1">
                        {log.command || "Terminal login handshake / Auth verification"}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">Risk: <strong className="text-white">{log.risk_score}%</strong></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        log.anomaly_verdict === 'High Risk' ? 'text-red-400 bg-red-950/20' : log.anomaly_verdict === 'Suspicious' ? 'text-amber-400 bg-amber-950/20' : 'text-slate-400'
                      }`}>
                        {log.anomaly_verdict}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};

export default BehaviourAnalytics;
