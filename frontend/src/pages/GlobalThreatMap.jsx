import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  GlobeAltIcon, 
  MapIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const NODES = [
  { id: 'ZUR', name: 'Zurich Central Hub (HQ)', x: 460, y: 105, type: 'hq', ip: '10.0.1.1', country: 'Switzerland', load: 'Nominal', anomalies: 0 },
  { id: 'NYC', name: 'New York Financial Hub', x: 220, y: 110, type: 'branch', ip: '10.12.4.92', country: 'United States', load: 'Nominal', anomalies: 0 },
  { id: 'LON', name: 'London Forex Gateway', x: 440, y: 90, type: 'branch', ip: '10.22.8.104', country: 'United Kingdom', load: 'Nominal', anomalies: 0 },
  { id: 'FRA', name: 'Frankfurt Core Datacenter', x: 470, y: 95, type: 'branch', ip: '10.5.12.8', country: 'Germany', load: 'Nominal', anomalies: 0 },
  { id: 'TOK', name: 'Tokyo Equities Exchange', x: 820, y: 115, type: 'branch', ip: '10.88.24.12', country: 'Japan', load: 'Nominal', anomalies: 0 },
  { id: 'BLR', name: 'Bangalore Dev Security Lab', x: 690, y: 190, type: 'branch', ip: '10.74.56.23', country: 'India', load: 'Nominal', anomalies: 0 },
  { id: 'TOR', name: 'Toronto Clearing House', x: 190, y: 100, type: 'branch', ip: '10.15.8.5', country: 'Canada', load: 'Nominal', anomalies: 0 }
];

const GlobalThreatMap = () => {
  const { token, addToast } = useAuth();
  
  // States
  const [mapNodes, setMapNodes] = useState(NODES);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Stylized simplified SVG paths for world continents (aesthetic dark high-tech vector projection)
  const CONTINENTS = [
    {
      name: "North America",
      path: "M 80,70 L 160,50 L 260,70 L 250,130 L 220,130 L 190,160 L 170,140 L 150,170 L 140,160 L 100,100 Z"
    },
    {
      name: "South America",
      path: "M 210,180 L 250,180 L 290,210 L 250,310 L 220,310 L 200,230 Z"
    },
    {
      name: "Greenland",
      path: "M 280,30 L 320,40 L 300,70 L 270,50 Z"
    },
    {
      name: "Eurasia",
      path: "M 420,60 L 520,50 L 680,40 L 840,50 L 880,100 L 860,180 L 780,220 L 720,240 L 680,200 L 600,240 L 580,210 L 510,180 L 460,180 L 420,120 Z"
    },
    {
      name: "Africa",
      path: "M 440,180 L 490,170 L 540,200 L 550,250 L 520,310 L 480,300 L 440,230 Z"
    },
    {
      name: "Australia",
      path: "M 780,260 L 830,260 L 840,290 L 800,310 L 770,290 Z"
    }
  ];

  const fetchActiveAlerts = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/logs?limit=8`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data.logs);
        
        // Map risk anomalies to nodes
        const updated = NODES.map(n => {
          // Count logs matching country
          const matched = data.logs.filter(l => l.location === n.country && l.risk_score >= 45);
          return {
            ...n,
            anomalies: matched.length,
            load: matched.length > 1 ? 'Critical' : matched.length > 0 ? 'Suspicious' : 'Nominal'
          };
        });
        setMapNodes(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveAlerts();
    
    // Auto-update every 10 seconds
    const interval = setInterval(fetchActiveAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const getCurvePath = (x1, y1, x2, y2) => {
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - 40;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    const associatedLogs = activeAlerts.filter(l => l.location === node.country);
    if (associatedLogs.length > 0 && node.id !== 'ZUR') {
      addToast(`Telemetry Hook`, `Retrieved ${associatedLogs.length} audit logs for ${node.country}.`, `Info`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            GLOBAL THREAT INTELLIGENCE PROJECTION
          </h2>
          <p className="text-xs text-slate-400">Inspecting geographic connection origins, encrypted tunnels, and active anomalies.</p>
        </div>
        <button
          onClick={fetchActiveAlerts}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/5 transition-all duration-200"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Map</span>
        </button>
      </div>

      {/* Main Map Box */}
      <GlassCard className="p-0 overflow-hidden relative border-white/5">
        {/* Visual Map Header HUD */}
        <div className="px-5 py-4 border-b border-white/5 bg-slate-950/40 flex justify-between items-center font-mono text-xs text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider">Security Command Projection Matrix</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> HQ Core</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> Branches</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500 pulse-red"></span> Anomalies</span>
          </div>
        </div>

        {/* Dynamic Vector Map Canvas */}
        <div className="relative bg-slate-950/50 p-6 flex items-center justify-center min-h-[400px]">
          <svg viewBox="0 0 960 360" className="w-full max-w-5xl select-none">
            {/* Grid blueprint lines */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="960" height="360" fill="url(#grid)" />

            {/* Concentric scope targets from HQ */}
            <circle cx="460" cy="105" r="90" fill="none" stroke="rgba(0, 240, 255, 0.02)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="460" cy="105" r="220" fill="none" stroke="rgba(0, 240, 255, 0.01)" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Render Continent outlines */}
            {CONTINENTS.map((c, i) => (
              <path
                key={i}
                d={c.path}
                fill="rgba(255, 255, 255, 0.02)"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
                className="hover:fill-white/[0.04] transition-all duration-300 cursor-help"
                title={c.name}
              />
            ))}

            {/* Glowing Connection Tunnels */}
            {mapNodes.filter(n => n.id !== 'ZUR').map(node => {
              const hasAnomaly = node.anomalies > 0;
              const strokeColor = hasAnomaly 
                ? (node.anomalies > 1 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)')
                : 'rgba(6, 182, 212, 0.15)';
              const dashColor = hasAnomaly
                ? (node.anomalies > 1 ? '#ef4444' : '#f59e0b')
                : '#06b6d4';

              return (
                <g key={`tunnel-${node.id}`}>
                  <path
                    d={getCurvePath(node.x, node.y, 460, 105)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />
                  <path
                    d={getCurvePath(node.x, node.y, 460, 105)}
                    fill="none"
                    stroke={dashColor}
                    strokeWidth="1.5"
                    strokeDasharray="6 20"
                    className="animate-[dash_8s_linear_infinite]"
                    style={{
                      strokeDashoffset: 100,
                      animationName: 'dash',
                      animationDuration: hasAnomaly ? '3s' : '6s'
                    }}
                  />
                </g>
              );
            })}

            <style dangerouslySetInnerHTML={{__html: `
              @keyframes dash {
                to {
                  stroke-dashoffset: -100;
                }
              }
            `}} />

            {/* Nodes Render */}
            {mapNodes.map(node => {
              const isHQ = node.type === 'hq';
              const hasAnomaly = node.anomalies > 0;
              const isSelected = selectedNode?.id === node.id;
              
              const pulseColor = hasAnomaly 
                ? (node.anomalies > 1 ? '#ef4444' : '#f59e0b')
                : (isHQ ? '#ffffff' : '#06b6d4');
              const ringColor = hasAnomaly
                ? (node.anomalies > 1 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)')
                : 'rgba(6, 182, 212, 0.3)';

              return (
                <g 
                  key={node.id} 
                  className="cursor-pointer"
                  onClick={() => handleNodeClick(node)}
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
                  )}

                  {/* Pulsing ring animation */}
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r={isHQ ? "15" : "9"} 
                    fill="none" 
                    stroke={ringColor} 
                    strokeWidth="1.5"
                    className="animate-ping"
                    style={{ animationDuration: hasAnomaly ? '1.5s' : '3.5s' }}
                  />

                  {/* Node Dot */}
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r={isHQ ? "6" : "4.5"} 
                    fill={pulseColor}
                    stroke="rgba(0,0,0,0.8)"
                    strokeWidth="1.5"
                  />

                  {/* Node Name Label */}
                  <text
                    x={node.x}
                    y={node.y - 12}
                    textAnchor="middle"
                    fill={hasAnomaly ? '#f87171' : '#cbd5e1'}
                    className="text-[9px] font-bold font-mono tracking-wide"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Canvas Floating Legend */}
          <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-white/5 font-mono text-[9px] text-slate-400 space-y-1 select-none pointer-events-none">
            <div className="font-bold text-white uppercase tracking-wider text-[10px] mb-1">PROJECTION SPEC</div>
            <div>Projections: <strong className="text-white">WGS-84 Flat</strong></div>
            <div>Crypto Shielding: <strong className="text-cyan-400">Kyber-768</strong></div>
            <div>Sync rate: <strong className="text-emerald-400">10,000ms polling</strong></div>
          </div>
        </div>
      </GlassCard>

      {/* Grid: Inspector and Logs list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node Inspector Drawer */}
        <GlassCard className="flex flex-col justify-between p-5 border-white/5" glowColor="blue">
          <div className="space-y-4">
            <div className="border-b border-white/5 pb-2.5 mb-3 flex items-center justify-between font-mono">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node telemetry</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 pulse-green"></span>
            </div>

            {selectedNode ? (
              <div className="space-y-3 font-mono text-xs text-slate-300">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Endpoint Location</span>
                  <strong className="text-white text-sm block mt-0.5">{selectedNode.name}</strong>
                  <span className="text-slate-400 block">{selectedNode.country}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Tunnel IP</span>
                    <span className="text-slate-200 font-semibold">{selectedNode.ip}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Operational status</span>
                    <span className={`inline-block mt-0.5 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase border ${
                      selectedNode.load === 'Critical' 
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : selectedNode.load === 'Suspicious'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {selectedNode.load}
                    </span>
                  </div>
                </div>
                {selectedNode.anomalies > 0 && (
                  <div className="p-2.5 rounded bg-red-950/20 border border-red-500/20 text-[10px] text-red-300 flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <strong>{selectedNode.anomalies} Threat Anomalies mapped.</strong> Connection blocked or flagged in live monitors.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 text-center py-10 font-mono">
                <MapIcon className="h-8 w-8 mx-auto text-slate-600 mb-2 animate-pulse" />
                <p className="text-[10px] leading-relaxed">
                  Select a coordinate node (HQ or Branch endpoints) on the visual projection canvas to review routing metadata and anomalies.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between font-mono text-[9px] text-slate-400">
            <span>Threat Vector Index:</span>
            <span className="text-white font-bold">Quantum Tunneling</span>
          </div>
        </GlassCard>

        {/* Live Threat Logs ticker */}
        <GlassCard className="lg:col-span-2 p-5 border-white/5">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4">Live Threat Stream Telemetry (Filtered Risk)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider text-slate-400 bg-white/[0.01]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Action Command</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] text-[11px] text-slate-300">
                {activeAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">No active anomaly logs retrieved from grid.</td>
                  </tr>
                ) : (
                  activeAlerts.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-2 px-3 text-slate-500">
                        {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">{l.username}</td>
                      <td className="py-2 px-3">{l.location}</td>
                      <td className="py-2 px-3 truncate max-w-[140px]" title={l.command}>{l.command || "Auth Session Handshake"}</td>
                      <td className={`py-2 px-3 text-center font-bold ${l.risk_score >= 80 ? 'text-red-400' : l.risk_score >= 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {l.risk_score}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default GlobalThreatMap;
