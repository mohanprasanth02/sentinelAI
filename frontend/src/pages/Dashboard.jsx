import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import ThreatRadar from '../components/ThreatRadar';
import { 
  UsersIcon, 
  ComputerDesktopIcon, 
  ExclamationCircleIcon, 
  NoSymbolIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { token, addToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        addToast("Fetch Error", "Failed to retrieve dashboard telemetry.", "High");
      }
    } catch (e) {
      console.error(e);
      addToast("Network Error", "Unable to connect to the SOC API service.", "High");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 10 seconds for real-time appearance
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Standard Loading Skeleton loader
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-white/5 rounded"></div>
          <div className="h-10 w-24 bg-white/5 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-white/5 rounded-2xl lg:col-span-2"></div>
          <div className="h-96 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Set up chart data
  const timelineDates = Object.keys(stats?.threat_timeline || {});
  const timelineCounts = Object.values(stats?.threat_timeline || {});

  const lineChartData = {
    labels: timelineDates,
    datasets: [
      {
        label: 'Anomalies Flagged',
        data: timelineCounts,
        fill: true,
        borderColor: '#00f0ff',
        backgroundColor: 'rgba(0, 240, 255, 0.04)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#00f0ff',
        pointHoverRadius: 6,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#71717a', font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#71717a', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 }
      }
    }
  };

  const distLabels = Object.keys(stats?.risk_distribution || {});
  const distCounts = Object.values(stats?.risk_distribution || {});

  const doughnutData = {
    labels: distLabels,
    datasets: [
      {
        data: distCounts,
        backgroundColor: [
          'rgba(16, 185, 129, 0.2)', // Emerald success
          'rgba(245, 158, 11, 0.25)', // Amber warning
          'rgba(239, 68, 68, 0.35)'   // Red alert
        ],
        borderColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444'
        ],
        borderWidth: 1.5,
        hoverOffset: 4
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Inter', size: 11 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    }
  };

  const getRiskColor = (val) => {
    if (val >= 80) return 'text-red-400';
    if (val >= 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-8">
      {/* Top Header Controls */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            SOC INTELLIGENCE CONSOLE
          </h2>
          <p className="text-xs text-slate-400">Live network security analysis and insider threat vectors.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-200 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Telemetry Sync</span>
        </button>
      </div>

      {/* Primary KPI Metrics Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard glowColor="blue" delay={0.05}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Staff</p>
              <h3 className="text-3xl font-mono font-bold mt-2 text-white">{stats?.active_users}</h3>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 shadow-neon-blue">
              <UsersIcon className="h-6 w-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="blue" delay={0.1}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Session Pipes</p>
              <h3 className="text-3xl font-mono font-bold mt-2 text-white">{stats?.live_sessions}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ComputerDesktopIcon className="h-6 w-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="purple" delay={0.15}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Threat Alerts</p>
              <h3 className="text-3xl font-mono font-bold mt-2 text-red-400">{stats?.threat_alerts}</h3>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <ExclamationCircleIcon className="h-6 w-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="purple" delay={0.2}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Locked Users</p>
              <h3 className="text-3xl font-mono font-bold mt-2 text-amber-400">{stats?.blocked_accounts}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <NoSymbolIcon className="h-6 w-6" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Average Risk Banner Score */}
      <GlassCard className="flex flex-col md:flex-row items-center justify-between gap-6" delay={0.25}>
        <div className="space-y-2 text-center md:text-left">
          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-900/30 px-3 py-1 rounded-full border border-cyan-400/20 font-mono tracking-widest uppercase">
            AVG RISK ASSESSMENT
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-white mt-2">
            Average Network Security Risk index: <span className={getRiskColor(stats?.avg_risk_score)}>{stats?.avg_risk_score}%</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Calculated across current privileged commands, VPN locations, failed attempts, and hour profiles. Values &lt;40% represent safe bounds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 pulse-green"></div>
          <span className="text-xs font-mono text-slate-300">Continuous AI Guard active</span>
        </div>
      </GlassCard>

      {/* Cyber Threat Radar Map Grid */}
      <ThreatRadar />

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Timeline */}
        <GlassCard className="lg:col-span-2 flex flex-col justify-between h-96" delay={0.3}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">Threat Timeline (7 Days)</h4>
            <span className="text-[10px] text-slate-400 font-mono">Incident Frequency</span>
          </div>
          <div className="flex-grow min-h-0">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </GlassCard>

        {/* Risk Distribution */}
        <GlassCard className="flex flex-col justify-between h-96" delay={0.35}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">Risk Distribution</h4>
            <span className="text-[10px] text-slate-400 font-mono">Log classification</span>
          </div>
          <div className="flex-grow min-h-0 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </GlassCard>
      </div>

      {/* Users & Sessions Data details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risk Users */}
        <GlassCard delay={0.4}>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4">Top At-Risk Staff Profiles</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  <th className="py-2.5">Username</th>
                  <th className="py-2.5 text-center">Avg Risk</th>
                  <th className="py-2.5 text-center">Max Risk</th>
                  <th className="py-2.5 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-xs font-mono text-slate-300">
                {stats?.top_risk_users.map((u) => (
                  <tr key={u.username} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 font-semibold text-slate-100">{u.username}</td>
                    <td className={`py-3 text-center ${getRiskColor(u.avg_risk)}`}>{u.avg_risk}%</td>
                    <td className={`py-3 text-center ${getRiskColor(u.max_risk)}`}>{u.max_risk}%</td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/behaviour?user=${u.username}`}
                        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      >
                        Examine Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Recent Sessions */}
        <GlassCard delay={0.45}>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4">Live Authenticated Sessions</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Location</th>
                  <th className="py-2.5">Device</th>
                  <th className="py-2.5 text-right">Session Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-xs font-mono text-slate-300">
                {stats?.recent_logins.map((l, i) => (
                  <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 font-semibold text-slate-100">{l.username}</td>
                    <td className="py-3">{l.country} ({l.ip_address})</td>
                    <td className="py-3 max-w-[120px] truncate">{l.device}</td>
                    <td className="py-3 text-right text-slate-400">
                      {new Date(l.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
