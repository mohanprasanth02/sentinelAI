import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { ArrowDownTrayIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

const getCurvePath = (x1, y1, x2, y2) => {
  const cx = (x1 + x2) / 2;
  const cy = Math.min(y1, y2) - 40;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
};

const LiveMonitor = () => {
  const { token, addToast } = useAuth();

  // State for search and filters
  const [searchUsername, setSearchUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVerdict, setSelectedVerdict] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Telemetry data
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [streamMode, setStreamMode] = useState('standard'); // 'standard' or 'live'

  const fetchLogs = async (isPoll = false) => {
    if (streamMode === 'live') return;
    if (!isPoll) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (searchUsername) params.append('username', searchUsername);
      if (selectedRole) params.append('role', selectedRole);
      if (selectedVerdict) params.append('verdict', selectedVerdict);

      const res = await fetch(`${API_URL}/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalLogs(data.total);
      }
    } catch (e) {
      console.error("Failed to load live monitor logs: ", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Trigger search on inputs (standard mode only)
  useEffect(() => {
    if (streamMode === 'standard') {
      setPage(1);
      fetchLogs();
    }
  }, [searchUsername, selectedRole, selectedVerdict, streamMode]);

  // Trigger search on pagination change (standard mode only)
  useEffect(() => {
    if (streamMode === 'standard') {
      fetchLogs();
    }
  }, [page, streamMode]);

  // Periodic polling for real-time appearance (standard mode only)
  useEffect(() => {
    if (streamMode !== 'standard') return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [page, searchUsername, selectedRole, selectedVerdict, streamMode]);

  // Simulated logs generator for Live Stream mode
  useEffect(() => {
    if (streamMode !== 'live') return;

    const initialLogs = [];
    const usernames = ['db_admin', 'sys_admin', 'finance_director', 'admin_sec', 'analyst_01', 'network_lead', 'dev_ops_01', 'chief_soc'];
    const roles = {
      db_admin: 'Privileged User', sys_admin: 'Privileged User', finance_director: 'Privileged User',
      admin_sec: 'Super Admin', analyst_01: 'Security Analyst', network_lead: 'Privileged User',
      dev_ops_01: 'Privileged User', chief_soc: 'Super Admin'
    };
    const depts = {
      db_admin: 'IT Infrastructure', sys_admin: 'IT Infrastructure', finance_director: 'Treasury',
      admin_sec: 'IT Infrastructure', analyst_01: 'Compliance', network_lead: 'IT Infrastructure',
      dev_ops_01: 'IT Infrastructure', chief_soc: 'IT Infrastructure'
    };
    const countries = ['United States', 'Germany', 'Canada', 'United Kingdom', 'Switzerland', 'China', 'Russia', 'India', 'Brazil'];
    const devices = ['Dell Latitude Compliance-03', 'HP EliteBook Trader-04', 'Lenovo ThinkPad SOC-01', 'MacBook Pro SecOps', 'Standard Workstation'];

    const cmdsLow = [
      'SELECT * FROM ledger_summary WHERE date=\'today\';',
      'GET /api/dashboard/stats HTTP/1.1',
      'ping -c 4 backup_vault.bank.internal',
      'ls -la /var/log/nginx/',
      'git pull origin production'
    ];
    const cmdsMed = [
      'DOWNLOAD FROM S3 bucket \'customer_PII_export_large\';',
      'ssh admin@10.0.12.94 -p 2222',
      'tar -czf logs_archive.tar.gz /var/log/audit/',
      'iptables -L -n | grep DROP'
    ];
    const cmdsHigh = [
      'DROP DATABASE customer_records CASCADE;',
      'RESET password FOR USER db_admin;',
      'CREATE USER threat_hunter WITH SUPERUSER;',
      'iptables -A INPUT -p tcp --dport 22 -j DROP;',
      'CHMOD 777 /etc/ssl/certs/banking_private_key.pem;'
    ];

    const generateLog = (offsetSeconds = 0) => {
      const username = usernames[Math.floor(Math.random() * usernames.length)];
      const randVal = Math.random();
      let riskCategory = 'low';
      let riskScore = Math.floor(Math.random() * 30) + 5;
      let verdict = 'Normal';
      let command = cmdsLow[Math.floor(Math.random() * cmdsLow.length)];
      let vpn = Math.random() < 0.05;

      if (randVal > 0.85) {
        riskCategory = 'high';
        riskScore = Math.floor(Math.random() * 19) + 80;
        verdict = 'High Risk';
        command = cmdsHigh[Math.floor(Math.random() * cmdsHigh.length)];
        vpn = Math.random() < 0.80;
      } else if (randVal > 0.60) {
        riskCategory = 'med';
        riskScore = Math.floor(Math.random() * 35) + 40;
        verdict = 'Suspicious';
        command = cmdsMed[Math.floor(Math.random() * cmdsMed.length)];
        vpn = Math.random() < 0.60;
      }

      return {
        id: 'SIM-' + (Date.now() - offsetSeconds * 1000) + '-' + Math.floor(Math.random() * 1000),
        timestamp: new Date(Date.now() - offsetSeconds * 1000).toISOString(),
        username,
        role: roles[username],
        department: depts[username] || 'General Operations',
        location: countries[Math.floor(Math.random() * countries.length)],
        ip_address: `10.0.${Math.floor(Math.random() * 240) + 10}.${Math.floor(Math.random() * 240) + 10}`,
        device: devices[Math.floor(Math.random() * devices.length)],
        vpn,
        command,
        failed_logins: riskCategory === 'high' ? Math.floor(Math.random() * 3) + 1 : 0,
        downloaded_files: riskCategory === 'high' ? Math.floor(Math.random() * 45) + 5 : Math.floor(Math.random() * 4),
        privileged: riskCategory === 'high' || (riskCategory === 'med' && Math.random() < 0.5),
        risk_score: riskScore,
        anomaly_verdict: verdict
      };
    };

    // Prepopulate 15 records offset in time
    for (let i = 14; i >= 0; i--) {
      initialLogs.push(generateLog(i * 12));
    }
    setLogs(initialLogs);
    setTotalLogs(initialLogs.length);
    setLoading(false);

    const autoEscalateIncident = async (log) => {
      try {
        const res = await fetch(`${API_URL}/incidents/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            username: log.username,
            risk_score: log.risk_score,
            description: `Auto-escalation: Live stream risk score ${log.risk_score}% exceeded 50% threshold.`,
            command: log.command,
            location: `${log.location} (${log.ip_address})`
          })
        });
        if (res.ok) {
          const data = await res.json();
          addToast(
            `Incident ${data.incident_number} Created`,
            `Risk score ${log.risk_score}% for ${log.username} auto-escalated to Incident Management.`,
            'High'
          );
        }
      } catch (err) {
        console.error("Failed to auto-escalate incident: ", err);
      }
    };

    // Dynamic streaming interval every 5 seconds
    const streamInterval = setInterval(() => {
      const newLog = generateLog(0);
      setLogs(prev => {
        const updated = [newLog, ...prev];
        if (updated.length > 50) updated.pop();
        setTotalLogs(updated.length);
        return updated;
      });

      if (newLog.risk_score > 50) {
        autoEscalateIncident(newLog);
      } else if (newLog.anomaly_verdict === 'High Risk') {
        addToast(`[STREAM Alert] ${newLog.username}`, `High risk action flagged: ${newLog.command}`, 'High');
      }
    }, 5000);

    return () => clearInterval(streamInterval);
  }, [streamMode, token]);

  const getVerdictStyle = (v) => {
    if (v === 'High Risk') return 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold';
    if (v === 'Suspicious') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  const getRiskBadgeColor = (score) => {
    if (score >= 80) return 'text-red-400 font-bold';
    if (score >= 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const exportCSV = () => {
    if (logs.length === 0) return;

    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Username,Role,Location,IP,Device,VPN,Command,RiskScore,Verdict\r\n";

    // Rows
    logs.forEach(l => {
      const row = [
        l.timestamp,
        l.username,
        l.role,
        l.location,
        l.ip_address,
        l.device,
        l.vpn ? "Yes" : "No",
        l.command ? `"${l.command.replace(/"/g, '""')}"` : "",
        l.risk_score,
        l.anomaly_verdict
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinel_sec_logs_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Export Complete", "Seeded active page rows to CSV document.", "Info");
  };

  const exportPDF = () => {
    const input = document.getElementById('log-table-view');
    addToast("PDF Generation", "Converting logs to high-fidelity PDF...", "Info");

    html2canvas(input, {
      scale: 1.8,
      backgroundColor: '#020617',
      useCORS: true
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const imgWidth = 290;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setFont("Helvetica", "bold");
      pdf.setTextColor(2, 6, 23);

      pdf.addImage(imgData, 'PNG', 3, 5, imgWidth, imgHeight);
      pdf.save(`sentinel_security_log_report.pdf`);
      addToast("Report Downloaded", "PDF compiled and exported successfully.", "Info");
    });
  };

  const totalPages = Math.ceil(totalLogs / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Styles for new row insertions */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes insert-slide-flash {
          0% {
            background-color: rgba(6, 182, 212, 0.25);
            transform: translateY(-8px);
            opacity: 0;
          }
          30% {
            background-color: rgba(6, 182, 212, 0.25);
            opacity: 1;
          }
          100% {
            background-color: transparent;
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-row-entry {
          animation: insert-slide-flash 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
      {/* Top Banner Control bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            TERMINAL SECURITY TELEMETRY
          </h2>
          <p className="text-xs text-slate-400">Live operational auditing logs across general financial pipelines.</p>
        </div>

        {/* Live / Static Streaming Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setStreamMode('standard')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200 cursor-pointer ${streamMode === 'standard'
                ? 'bg-white/10 text-white shadow-glass border border-white/10'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            Database Logs (Standard)
          </button>
          <button
            onClick={() => setStreamMode('live')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${streamMode === 'live'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${streamMode === 'live' ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`}></span>
            Real-Time Stream (Dynamic Risks)
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/15 text-xs font-mono text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>CSV Export</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-mono text-white transition-colors shadow-neon-purple"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>PDF Summary</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Criteria Bar */}
      <GlassCard className="p-4" delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Username Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Username..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="w-full pl-9 py-1.5 glass-input text-xs"
            />
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="glass-input py-1.5 text-xs cursor-pointer text-slate-300"
          >
            <option value="">All Security Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Security Analyst">Security Analyst</option>
            <option value="Privileged User">Privileged User</option>
          </select>

          {/* Anomaly Verdict Filter */}
          <select
            value={selectedVerdict}
            onChange={(e) => setSelectedVerdict(e.target.value)}
            className="glass-input py-1.5 text-xs cursor-pointer text-slate-300"
          >
            <option value="">All Threat Levels</option>
            <option value="Normal">Normal</option>
            <option value="Suspicious">Suspicious</option>
            <option value="High Risk">High Risk</option>
          </select>

          {/* Total Counter indicators */}
          <div className="flex items-center justify-end text-xs font-mono text-slate-400 pr-2">
            <span>
              {streamMode === 'live' ? 'Streaming feed: ' : 'Query hits: '}
              <strong className="text-cyan-400">{totalLogs}</strong> entries
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Main Table view */}
      <GlassCard className="p-0 overflow-hidden" delay={0.1}>
        <div id="log-table-view" className="p-4 bg-slate-950/20">
          {/* Visual PDF header embedded (visible only on pdf canvas) */}
          <div className="hidden pdf-only flex justify-between items-center pb-4 mb-4 border-b border-white/10">
            <span className="text-sm font-bold text-white tracking-widest font-mono">SENTINELAI SECURITY INTELLIGENCE REPORT</span>
            <span className="text-xs text-slate-400 font-mono">{new Date().toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Location (IP)</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4 text-center">VPN</th>
                  <th className="py-3 px-4">Action Executed</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4 text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] text-xs font-mono text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-6 w-6 border-2 border-t-cyan-400 border-white/10 rounded-full animate-spin"></div>
                        <span className="text-slate-400 text-xs animate-pulse">STREAMING LIVE LOG PIPELINE...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                      No matching audit telemetry matches the query criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-white/[0.03] transition-colors group cursor-pointer ${streamMode === 'live' ? 'animate-row-entry' : ''
                        }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3 px-4 text-slate-400 font-sans">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-100 font-sans">{log.username}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">{log.role}</td>
                      <td className="py-3 px-4">
                        {log.location} <span className="text-slate-500">({log.ip_address})</span>
                      </td>
                      <td className="py-3 px-4 max-w-[150px] truncate text-slate-400" title={log.device}>
                        {log.device}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${log.vpn ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/20' : 'text-slate-600'
                          }`}>
                          {log.vpn ? "VPN" : "Direct"}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-200 group-hover:text-cyan-300 transition-colors" title={log.command}>
                        {log.command || <span className="text-slate-600 font-sans">Session Access / Handshake</span>}
                      </td>
                      <td className={`py-3 px-4 text-center ${getRiskBadgeColor(log.risk_score)}`}>
                        {log.risk_score}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold ${getVerdictStyle(log.anomaly_verdict)}`}>
                          {log.anomaly_verdict}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Control bar */}
        {streamMode === 'live' ? (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 bg-slate-950/40 w-full text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Dynamic log pipeline active. Feed limit: 50 rolling events.</span>
            </div>
            <div>[Live streaming mode - pagination disabled]</div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 bg-slate-950/40">
            <div className="text-xs text-slate-400 font-mono">
              Showing Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalLogs} records)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-400 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-400 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-2xl shadow-glass border-white/10 relative">
            {/* Header */}
            <div className="border-b border-white/5 pb-3 mb-4 flex justify-between items-center">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center gap-2">
                <span>AUDIT TELEMETRY RECORD #{selectedLog.id}</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white font-mono text-xs hover:bg-white/10 px-2.5 py-1 rounded cursor-pointer"
              >
                CLOSE [X]
              </button>
            </div>

            {/* Details body */}
            <div className="space-y-4 font-mono text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Operator Identity</span>
                  <strong className="text-white text-sm block mt-0.5">{selectedLog.username}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{selectedLog.role} ({selectedLog.department || 'N/A'})</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Origin Location</span>
                  <strong className="text-white text-sm block mt-0.5">{selectedLog.location}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{selectedLog.ip_address} {selectedLog.vpn && <span className="text-cyan-400 font-bold">(VPN CONNECT)</span>}</span>
                </div>
              </div>

              {/* Mini Threat Geolocator Map */}
              <div className="border-t border-white/5 pt-3">
                <span className="text-[9px] uppercase text-slate-500 block mb-1.5">Origin Threat Geolocator</span>
                <div className="w-full h-32 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 320 120" className="w-full h-full select-none">
                    {/* Grid background */}
                    <pattern id="miniGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="0.5" />
                    </pattern>
                    <rect width="320" height="120" fill="url(#miniGrid)" />

                    {/* Stylized continent paths (scaled down to 320x120) */}
                    {/* North America */}
                    <path d="M 25,23 L 53,16 L 86,23 L 83,43 L 73,43 L 63,53 L 56,46 L 50,56 L 46,53 L 33,33 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    {/* South America */}
                    <path d="M 70,60 L 83,60 L 96,70 L 83,103 L 73,103 L 66,76 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    {/* Eurasia / Europe */}
                    <path d="M 140,20 L 173,16 L 226,13 L 280,16 L 293,33 L 286,60 L 260,73 L 240,80 L 226,66 L 200,80 L 193,70 L 170,60 L 153,60 L 140,40 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    {/* Africa */}
                    <path d="M 146,60 L 163,56 L 180,66 L 183,83 L 173,103 L 160,100 L 146,76 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    {/* Australia */}
                    <path d="M 260,86 L 276,86 L 280,96 L 266,103 L 256,96 Z" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

                    {/* Plot coordinates helper */}
                    {(() => {
                      // Lookup coordinate matching selectedLog.location
                      const loc = (selectedLog.location || '').toLowerCase();
                      let targetX = 153; // Default near Europe
                      let targetY = 35;

                      if (loc.includes('united states') || loc.includes('us')) { targetX = 55; targetY = 30; }
                      else if (loc.includes('canada')) { targetX = 48; targetY = 23; }
                      else if (loc.includes('united kingdom') || loc.includes('uk') || loc.includes('london')) { targetX = 142; targetY = 28; }
                      else if (loc.includes('germany') || loc.includes('frankfurt')) { targetX = 155; targetY = 30; }
                      else if (loc.includes('switzerland') || loc.includes('zurich')) { targetX = 153; targetY = 35; }
                      else if (loc.includes('china')) { targetX = 245; targetY = 48; }
                      else if (loc.includes('russia')) { targetX = 210; targetY = 24; }
                      else if (loc.includes('india') || loc.includes('bangalore')) { targetX = 220; targetY = 62; }
                      else if (loc.includes('brazil')) { targetX = 82; targetY = 75; }
                      else if (loc.includes('singapore')) { targetX = 238; targetY = 70; }

                      const hqX = 153; // Zurich HQ
                      const hqY = 35;

                      const isHQ = targetX === hqX && targetY === hqY;
                      const hasHighRisk = selectedLog.risk_score >= 80;
                      const hasMedRisk = selectedLog.risk_score >= 40 && selectedLog.risk_score < 80;

                      const beaconColor = hasHighRisk ? '#ef4444' : hasMedRisk ? '#f59e0b' : '#10b981';
                      const beaconPulse = hasHighRisk ? 'rgba(239, 68, 68, 0.4)' : hasMedRisk ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';

                      return (
                        <g>
                          {/* Connection Arc */}
                          {!isHQ && (
                            <path
                              d={getCurvePath(targetX, targetY, hqX, hqY)}
                              fill="none"
                              stroke="rgba(0, 240, 255, 0.15)"
                              strokeWidth="0.8"
                              strokeDasharray="2 3"
                            />
                          )}

                          {/* Dynamic moving packet */}
                          {!isHQ && (
                            <circle r="1.5" fill="#00f0ff">
                              <animateMotion
                                path={getCurvePath(targetX, targetY, hqX, hqY)}
                                dur="2.5s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}

                          {/* Bank HQ point (Zurich) */}
                          <circle cx={hqX} cy={hqY} r="3" fill="#ffffff" stroke="rgba(0,0,0,0.8)" strokeWidth="1" />
                          <circle cx={hqX} cy={hqY} r="7" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" className="animate-ping" style={{ animationDuration: '3s' }} />

                          {/* Origin point beacon */}
                          {!isHQ && (
                            <>
                              <circle
                                cx={targetX}
                                cy={targetY}
                                r="8"
                                fill="none"
                                stroke={beaconPulse}
                                strokeWidth="1"
                                className="animate-ping"
                                style={{ animationDuration: '1.2s' }}
                              />
                              <circle
                                cx={targetX}
                                cy={targetY}
                                r="3.5"
                                fill={beaconColor}
                                stroke="rgba(0,0,0,0.8)"
                                strokeWidth="1"
                              />
                            </>
                          )}
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Latency Floating Tag */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/5 text-[8px] text-slate-400 font-mono flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>ORIGIN LATENCY: {selectedLog.vpn ? '124ms (VPN)' : '28ms'}</span>
                  </div>

                  {/* Country Flag Tag */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/5 text-[8px] text-slate-300 font-mono">
                    IP GEOLOCATION: {selectedLog.location?.toUpperCase() || 'UNKNOWN'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Timestamp</span>
                  <span className="text-slate-200 block mt-1">{new Date(selectedLog.timestamp).toLocaleString([], { dateStyle: 'long', timeStyle: 'medium' })}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Device Signature</span>
                  <span className="text-slate-200 block mt-1 truncate" title={selectedLog.device}>{selectedLog.device}</span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <span className="text-[9px] uppercase text-slate-500 block mb-1">Executed Action / Command</span>
                {selectedLog.command ? (
                  <pre className="bg-black/60 p-3 rounded-lg border border-white/5 text-[11px] text-cyan-300 overflow-x-auto select-all max-h-24">
                    {selectedLog.command}
                  </pre>
                ) : (
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-slate-500 italic">
                    Standard Authentication Handshake / Heartbeat log. No privileged commands executed.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-3">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Risk Score Index</span>
                  <strong className={`text-base block mt-0.5 ${selectedLog.risk_score >= 80 ? 'text-red-400' : selectedLog.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{selectedLog.risk_score}%</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">AI Anomaly Verdict</span>
                  <strong className="text-white text-xs block mt-1 uppercase">{selectedLog.anomaly_verdict}</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Security Policy</span>
                  <strong className={`text-[10px] block mt-1 uppercase ${selectedLog.privileged ? 'text-amber-300' : 'text-slate-400'}`}>
                    {selectedLog.privileged ? '⚠️ Privileged Operation' : 'Standard Access'}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Downloads Triggered</span>
                  <span className="text-slate-300 block mt-0.5">{selectedLog.downloaded_files} files</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Failed Login Attempts</span>
                  <span className="text-slate-300 block mt-0.5">{selectedLog.failed_logins} failures</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="mt-6 flex justify-end gap-2 border-t border-white/5 pt-4">
              <Link
                to={`/behaviour?user=${selectedLog.username}`}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 hover:text-white text-slate-300 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(null)}
              >
                Inspect UBA Profile
              </Link>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white uppercase transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitor;
