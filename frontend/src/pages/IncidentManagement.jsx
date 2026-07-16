import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  UserPlusIcon, 
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';

const IncidentManagement = () => {
  const { token, user, addToast } = useAuth();

  // Page States
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Selected incident details for slide-over panel/modal
  const [activeIncident, setActiveIncident] = useState(null);
  
  // Forms states
  const [newComment, setNewComment] = useState('');
  const [assignee, setAssignee] = useState('');
  const [statusVal, setStatusVal] = useState('');
  
  // Decrypted cache (stores decapsulated descriptions locally by incident number)
  const [decryptedCache, setDecryptedCache] = useState({});
  const [decrypting, setDecrypting] = useState({});

  // SOC Playbook War Room states
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'playbook'
  const [lockedUsers, setLockedUsers] = useState({});
  const [sessionsRevoked, setSessionsRevoked] = useState({});

  // Sync state values on selection
  useEffect(() => {
    if (activeIncident) {
      setAssignee(activeIncident.assigned_analyst || '');
      setStatusVal(activeIncident.status);
      setActiveTab('details');
    }
  }, [activeIncident]);

  const fetchIncidents = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
        // Refresh active incident details if open
        if (activeIncident) {
          const updated = data.find(i => i.incident_number === activeIncident.incident_number);
          if (updated) setActiveIncident(updated);
        }
      }
    } catch (e) {
      console.error(e);
      addToast("Fetch Error", "Failed to retrieve incident roster.", "High");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleStatusChange = async (incNum, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/incidents/${incNum}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        addToast("Incident Status Update", `Ticket ${incNum} marked as ${newStatus}.`, "Info");
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignAnalyst = async (incNum, analystName) => {
    try {
      const res = await fetch(`${API_URL}/incidents/${incNum}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ assigned_analyst: analystName })
      });
      if (res.ok) {
        addToast("Incident Assigned", `Ticket ${incNum} allocated to ${analystName}.`, "Info");
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeIncident) return;
    try {
      const res = await fetch(`${API_URL}/incidents/${activeIncident.incident_number}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comment: newComment })
      });
      if (res.ok) {
        addToast("Comment Added", "Incident notes updated.", "Info");
        setNewComment('');
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const decryptIncident = async (incNum) => {
    if (user.role !== 'Super Admin') {
      addToast("Access Denied", "Only Super Admins hold decapsulation keys for incident files.", "High");
      return;
    }
    
    setDecrypting(prev => ({ ...prev, [incNum]: true }));
    try {
      const res = await fetch(`${API_URL}/api/quantum/decrypt-incident/${incNum}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fallback url check (sometimes FastAPI parses routing paths differently)
      let resolvedRes = res;
      if (!res.ok) {
        resolvedRes = await fetch(`${API_URL}/quantum/decrypt-incident/${incNum}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (resolvedRes.ok) {
        const data = await resolvedRes.json();
        setDecryptedCache(prev => ({ ...prev, [incNum]: data.decrypted_description }));
        addToast("Kyber Decapsulation Clear", "AES key extracted from ML-KEM encapsulation. Incident decrypted.", "Info");
      } else {
        const err = await resolvedRes.json();
        addToast("Decryption Mismatch", err.detail || "Kyber private key check failed.", "High");
      }
    } catch (e) {
      console.error(e);
      addToast("Crypto Failure", "Decapsulation pipeline error.", "High");
    } finally {
      setDecrypting(prev => ({ ...prev, [incNum]: false }));
    }
  };

  const exportIncidentPDF = (inc) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const desc = decryptedCache[inc.incident_number] || "LOCKED (Quantum Encrypted Details)";
    
    pdf.setFont("Courier", "bold");
    pdf.setFontSize(16);
    pdf.text("SENTINELAI SEC-INCIDENT REPORT", 14, 20);
    
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    pdf.line(14, 28, 196, 28);
    
    // Details
    pdf.setFontSize(11);
    pdf.setTextColor(2, 6, 23);
    pdf.setFont("Helvetica", "bold");
    pdf.text("Metadata Indicators:", 14, 38);
    
    pdf.setFont("Helvetica", "normal");
    pdf.text(`Incident ID: ${inc.incident_number}`, 14, 46);
    pdf.text(`Subject User: ${inc.user}`, 14, 52);
    pdf.text(`Correlated Risk Index: ${inc.risk_score}%`, 14, 58);
    pdf.text(`Ticket Status: ${inc.status}`, 14, 64);
    pdf.text(`Assigned Officer: ${inc.assigned_analyst || 'Unassigned'}`, 14, 70);
    
    pdf.setFont("Helvetica", "bold");
    pdf.text("Incident Description (ML-KEM Protected):", 14, 82);
    pdf.setFont("Helvetica", "normal");
    
    // Multi-line split for description
    const splitDesc = pdf.splitTextToSize(desc, 180);
    pdf.text(splitDesc, 14, 88);
    
    const descHeight = splitDesc.length * 5;
    let commentStart = 88 + descHeight + 15;
    
    pdf.setFont("Helvetica", "bold");
    pdf.text("Audit Thread Comments:", 14, commentStart);
    pdf.setFont("Helvetica", "normal");
    
    inc.comments.forEach((c, idx) => {
      const line = `[${c.timestamp}] ${c.analyst}: ${c.comment}`;
      const splitLine = pdf.splitTextToSize(line, 180);
      pdf.text(splitLine, 14, commentStart + 8 + (idx * 12));
    });
    
    pdf.save(`Incident_Report_${inc.incident_number}.pdf`);
    addToast("Export Successful", `Compiled incident PDF for ${inc.incident_number}`, "Info");
  };

  const getStatusBadge = (s) => {
    if (s === 'Open') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (s === 'Investigating') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            INCIDENT TICKET ARCHIVE
          </h2>
          <p className="text-xs text-slate-400">Review security anomalies, reassign analysts, append comment trails, and decrypt reports.</p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Tickets</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents List table */}
        <div className={`${activeIncident ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all duration-300`}>
          <GlassCard className="p-0 overflow-hidden" delay={0.05}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.01]">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4 text-center">Risk Index</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Officer</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs font-mono text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">Loading incidents database...</td>
                    </tr>
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">No anomalous incidents registered yet.</td>
                    </tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr 
                        key={inc.id} 
                        className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                          activeIncident?.incident_number === inc.incident_number ? 'bg-indigo-500/5' : ''
                        }`}
                        onClick={() => {
                          setActiveIncident(inc);
                          setAssignee(inc.assigned_analyst || '');
                          setStatusVal(inc.status);
                        }}
                      >
                        <td className="py-3 px-4 font-bold text-white font-sans">{inc.incident_number}</td>
                        <td className="py-3 px-4 font-sans">{inc.user}</td>
                        <td className="py-3 px-4 text-center text-red-400 font-bold">{inc.risk_score}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${getStatusBadge(inc.status)}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-sans">
                          {inc.assigned_analyst || <span className="text-slate-600">Unassigned</span>}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => exportIncidentPDF(inc)}
                              title="Download report PDF"
                              className="p-1 rounded bg-white/5 border border-white/10 hover:border-indigo-400/40 text-indigo-400 transition-colors"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveIncident(inc);
                                setAssignee(inc.assigned_analyst || '');
                                setStatusVal(inc.status);
                              }}
                              className="text-xs px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 hover:bg-indigo-600/40 transition-all duration-200"
                            >
                              Audit File
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Slide-over Detail Panel */}
        {activeIncident && (
          <div className="w-full lg:w-[440px] flex-shrink-0 animate-fadeIn">
            <GlassCard className="h-full flex flex-col justify-between p-5 border-white/5 space-y-4" glowColor="blue">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-bold text-white font-mono text-sm">{activeIncident.incident_number}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Subject Account: {activeIncident.user}</span>
                  </div>
                  <button 
                    onClick={() => setActiveIncident(null)}
                    className="text-slate-500 hover:text-slate-300 font-mono text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-white/5 font-mono text-[10px]">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-2 text-center font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'details' 
                        ? 'border-cyan-500 text-cyan-400' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Incident Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('playbook')}
                    className={`flex-1 py-2 text-center font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'playbook' 
                        ? 'border-purple-500 text-purple-400' 
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                    SOC War Room Playbook
                  </button>
                </div>

                {activeTab === 'details' ? (
                  <div className="space-y-4">
                    {/* Details indicators */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Risk Score</span>
                        <strong className="text-red-400 text-sm">{activeIncident.risk_score}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Status Tiers</span>
                        <select
                          value={statusVal}
                          onChange={(e) => {
                            setStatusVal(e.target.value);
                            handleStatusChange(activeIncident.incident_number, e.target.value);
                          }}
                          className="glass-input py-0.5 mt-0.5 w-full text-[11px]"
                        >
                          <option value="Open">Open</option>
                          <option value="Investigating">Investigating</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 uppercase text-[9px] block">Security Assignee</span>
                        <select
                          value={assignee}
                          onChange={(e) => {
                            setAssignee(e.target.value);
                            handleAssignAnalyst(activeIncident.incident_number, e.target.value);
                          }}
                          className="glass-input py-0.5 mt-0.5 w-full text-[11px]"
                        >
                          <option value="">Select Analyst...</option>
                          <option value="analyst_01">analyst_01 (Analyst)</option>
                          <option value="analyst_02">analyst_02 (Analyst)</option>
                          <option value="chief_soc">chief_soc (Admin)</option>
                        </select>
                      </div>
                    </div>

                    {/* Encrypted report description vault */}
                    <div className="p-3.5 bg-slate-950/80 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1"><LockClosedIcon className="h-3.5 w-3.5 text-purple-400" /> ML-KEM Vault</span>
                        <span className="text-purple-300">Quantum Safe</span>
                      </div>
                      
                      {decryptedCache[activeIncident.incident_number] ? (
                        <p className="text-[11px] font-sans text-slate-200 leading-relaxed bg-white/[0.01] p-2 rounded border border-white/5">
                          {decryptedCache[activeIncident.incident_number]}
                        </p>
                      ) : (
                        <div className="space-y-3 py-2 text-center">
                          <p className="text-[10px] text-slate-500 font-mono">
                            Incident telemetry is encrypted with hybrid Kyber-768 public keys.
                          </p>
                          {user.role === 'Super Admin' ? (
                            <button
                              onClick={() => decryptIncident(activeIncident.incident_number)}
                              disabled={decrypting[activeIncident.incident_number]}
                              className="w-full py-1.5 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-500/20 text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {decrypting[activeIncident.incident_number] ? (
                                <div className="h-3 w-3 border border-t-transparent border-purple-300 rounded-full animate-spin"></div>
                              ) : (
                                <span>Decrypt Description</span>
                              )}
                            </button>
                          ) : (
                            <div className="text-[10px] text-red-500 font-bold border border-red-500/20 bg-red-950/20 p-2 rounded leading-relaxed">
                              Only Super Admins hold decapsulation access for this incident payload.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comments Stream */}
                    <div className="space-y-2">
                      <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block">Audit Log Comments</span>
                      <div className="max-h-[140px] overflow-y-auto space-y-2.5 pr-1 font-mono text-[10px]">
                        {activeIncident.comments.map((c, i) => (
                          <div key={i} className="bg-white/[0.01] p-2 rounded border border-white/5 space-y-1">
                            <div className="flex justify-between text-slate-500 text-[9px]">
                              <span>{c.analyst}</span>
                              <span>{c.timestamp.split(" ")[0]}</span>
                            </div>
                            <p className="text-slate-300 leading-normal">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Playbook List */
                  <div className="space-y-4 font-mono text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] text-cyan-400 mb-2">
                      <span>Threat Containment Incident Response Checklist</span>
                    </div>

                    {/* Step 1: Containment */}
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className={`h-4 w-4 rounded-full border text-[9px] flex items-center justify-center ${
                            lockedUsers[activeIncident.user] ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 text-slate-500'
                          }`}>
                            {lockedUsers[activeIncident.user] ? '✓' : '1'}
                          </span>
                          <span>Step 1: Account Containment</span>
                        </span>
                        <span className={`text-[9px] font-bold uppercase ${
                          lockedUsers[activeIncident.user] ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          {lockedUsers[activeIncident.user] ? 'Contained' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Lock the suspect user account ('{activeIncident.user}') in Active Directory registers.</p>
                      
                      {lockedUsers[activeIncident.user] ? (
                        <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-500/20 p-2 rounded">
                          🔒 User '{activeIncident.user}' account status set to LOCKED.
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            const res = await fetch(`${API_URL}/users/${activeIncident.user}/lock`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) {
                              setLockedUsers(prev => ({ ...prev, [activeIncident.user]: true }));
                              addToast("Containment Success", `Suspect account '${activeIncident.user}' locked.`, "High");
                            }
                          }}
                          className="w-full py-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-500/30 rounded text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer"
                        >
                          Execute: Lock User Account
                        </button>
                      )}
                    </div>

                    {/* Step 2: Investigation */}
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className={`h-4 w-4 rounded-full border text-[9px] flex items-center justify-center ${
                            decryptedCache[activeIncident.incident_number] ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 text-slate-500'
                          }`}>
                            {decryptedCache[activeIncident.incident_number] ? '✓' : '2'}
                          </span>
                          <span>Step 2: Decrypt Description</span>
                        </span>
                        <span className={`text-[9px] font-bold uppercase ${
                          decryptedCache[activeIncident.incident_number] ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          {decryptedCache[activeIncident.incident_number] ? 'Decrypted' : 'Encrypted'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Decapsulate AES session key using ML-KEM / Kyber-768 key pairs.</p>
                      
                      {decryptedCache[activeIncident.incident_number] ? (
                        <div className="space-y-1">
                          <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/10 border border-emerald-500/10 p-2 rounded">
                            🔑 Kyber Decapsulation complete. Decrypted payload:
                          </div>
                          <pre className="bg-black/60 p-2 rounded text-[9px] text-purple-300 overflow-x-auto max-h-16">
                            {decryptedCache[activeIncident.incident_number]}
                          </pre>
                        </div>
                      ) : (
                        <button
                          onClick={() => decryptIncident(activeIncident.incident_number)}
                          disabled={decrypting[activeIncident.incident_number]}
                          className="w-full py-1.5 bg-purple-950/20 hover:bg-purple-900/30 text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                        >
                          {decrypting[activeIncident.incident_number] ? 'Decapsulating ML-KEM...' : 'Execute: Decrypt Payload'}
                        </button>
                      )}
                    </div>

                    {/* Step 3: Mitigation */}
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className={`h-4 w-4 rounded-full border text-[9px] flex items-center justify-center ${
                            sessionsRevoked[activeIncident.incident_number] ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 text-slate-500'
                          }`}>
                            {sessionsRevoked[activeIncident.incident_number] ? '✓' : '3'}
                          </span>
                          <span>Step 3: Terminate Network Pipes</span>
                        </span>
                        <span className={`text-[9px] font-bold uppercase ${
                          sessionsRevoked[activeIncident.incident_number] ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          {sessionsRevoked[activeIncident.incident_number] ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Kill all active authenticated network sessions for this operator.</p>
                      
                      {sessionsRevoked[activeIncident.incident_number] ? (
                        <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-500/20 p-2 rounded">
                          ⚡ Sessions Revoked. User tokens deleted from token cache.
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            const res = await fetch(`${API_URL}/users/${activeIncident.user}/terminate-sessions`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) {
                              setSessionsRevoked(prev => ({ ...prev, [activeIncident.incident_number]: true }));
                              addToast("Sessions Revoked", `Terminated all active tokens for '${activeIncident.user}'.`, "Info");
                            }
                          }}
                          className="w-full py-1.5 bg-amber-950/20 hover:bg-amber-900/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer"
                        >
                          Execute: Terminate Sessions
                        </button>
                      )}
                    </div>

                    {/* Step 4: Resolution */}
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className={`h-4 w-4 rounded-full border text-[9px] flex items-center justify-center ${
                            activeIncident.status === 'Resolved' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 text-slate-500'
                          }`}>
                            {activeIncident.status === 'Resolved' ? '✓' : '4'}
                          </span>
                          <span>Step 4: Close Ticket & Report</span>
                        </span>
                        <span className={`text-[9px] font-bold uppercase ${
                          activeIncident.status === 'Resolved' ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          {activeIncident.status === 'Resolved' ? 'Closed' : 'Open'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Resolve the incident ticket and compile the PDF SOC report.</p>
                      
                      {activeIncident.status === 'Resolved' ? (
                        <button
                          onClick={() => exportIncidentPDF(activeIncident)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                          <span>Download PDF Report</span>
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await handleStatusChange(activeIncident.incident_number, 'Resolved');
                            exportIncidentPDF(activeIncident);
                            addToast("Incident Resolved", `Ticket ${activeIncident.incident_number} successfully resolved. Report exported.`, "Info");
                            setActiveIncident(null);
                          }}
                          disabled={!lockedUsers[activeIncident.user] || !decryptedCache[activeIncident.incident_number] || !sessionsRevoked[activeIncident.incident_number]}
                          className="w-full py-1.5 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold uppercase transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          Compile & Resolve Ticket
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Comment Form (only shown in Details tab) */}
              {activeTab === 'details' && (
                <form onSubmit={handleAddComment} className="flex gap-2 border-t border-white/5 pt-3">
                  <input
                    type="text"
                    placeholder="Add comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-grow glass-input py-1.5 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono uppercase transition-colors cursor-pointer"
                  >
                    Post
                  </button>
                </form>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentManagement;
