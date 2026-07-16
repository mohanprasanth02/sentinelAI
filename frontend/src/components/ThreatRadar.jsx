import React, { useState } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

const NODES = [
  { id: 'ZUR', name: 'Zurich Central Core (HQ)', x: 480, y: 165, type: 'hq', ip: '10.0.1.1', country: 'Switzerland', load: 'Nominal', anomalies: 0 },
  { id: 'NYC', name: 'New York Clearing Hub', x: 220, y: 180, type: 'branch', ip: '10.12.4.92', country: 'United States', load: 'Nominal', anomalies: 0 },
  { id: 'LON', name: 'London Forex Gateway', x: 420, y: 130, type: 'branch', ip: '10.22.8.104', country: 'United Kingdom', load: 'Suspicious', anomalies: 1 },
  { id: 'FRA', name: 'Frankfurt Backup Vault', x: 505, y: 145, type: 'branch', ip: '10.5.12.8', country: 'Germany', load: 'Nominal', anomalies: 0 },
  { id: 'TOK', name: 'Tokyo Equities Node', x: 800, y: 195, type: 'branch', ip: '10.88.24.12', country: 'Japan', load: 'Nominal', anomalies: 0 },
  { id: 'BLR', name: 'Bangalore Dev SecOps Lab', x: 690, y: 240, type: 'branch', ip: '10.74.56.23', country: 'India', load: 'Nominal', anomalies: 0 },
  { id: 'TOR', name: 'Toronto Retail Bridge', x: 190, y: 155, type: 'branch', ip: '10.15.8.5', country: 'Canada', load: 'Critical', anomalies: 2 }
];

const ThreatRadar = () => {
  const [hoveredNode, setHoveredNode] = useState(null);

  // Generate curved SVG paths between branch nodes and Switzerland HQ (Zurich)
  const getCurvePath = (x1, y1, x2, y2) => {
    // Control point for a smooth quadratic bezier curve bowing upwards
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - 35;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-glass border-white/5 relative overflow-hidden flex flex-col md:flex-row gap-5 items-stretch min-h-[360px]">
      {/* Visual Canvas Panel */}
      <div className="flex-grow relative bg-black/40 rounded-xl border border-white/[0.03] overflow-hidden min-h-[280px]">
        {/* Scope sweep styling injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes radar-sweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-radar-sweep {
            transform-origin: 480px 165px;
            animation: radar-sweep 12s linear infinite;
          }
        `}} />

        <svg viewBox="0 0 960 320" className="w-full h-full select-none">
          {/* Radial scope circles originating from Zurich HQ */}
          <circle cx="480" cy="165" r="70" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="480" cy="165" r="150" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="480" cy="165" r="240" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          <circle cx="480" cy="165" r="320" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="6 6" />

          {/* Coordinate Crosshairs */}
          <line x1="480" y1="0" x2="480" y2="320" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          <line x1="0" y1="165" x2="960" y2="165" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

          {/* Glowing Animated Network Tunnels */}
          {NODES.filter(n => n.id !== 'ZUR').map(node => {
            const hasAnomaly = node.anomalies > 0;
            const strokeColor = hasAnomaly 
              ? (node.anomalies > 1 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)')
              : 'rgba(0, 240, 255, 0.15)';
            const dashColor = hasAnomaly
              ? (node.anomalies > 1 ? '#ef4444' : '#f59e0b')
              : '#00f0ff';
            
            return (
              <g key={`tunnel-${node.id}`}>
                {/* Underlay curve */}
                <path
                  d={getCurvePath(node.x, node.y, 480, 165)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {/* Moving data packets along path */}
                <path
                  d={getCurvePath(node.x, node.y, 480, 165)}
                  fill="none"
                  stroke={dashColor}
                  strokeWidth="1.5"
                  strokeDasharray="6 24"
                  className="animate-[dash_6s_linear_infinite]"
                  style={{
                    strokeDashoffset: 100,
                    animationName: 'dash',
                    animationDuration: hasAnomaly ? '2.5s' : '5s'
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

          {/* Radar Sweep Wedge */}
          <line 
            x1="480" 
            y1="165" 
            x2="900" 
            y2="165" 
            stroke="url(#sweepGradient)" 
            strokeWidth="2" 
            className="animate-radar-sweep"
          />

          {/* Defs for gradients */}
          <defs>
            <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0, 240, 255, 0)" />
              <stop offset="90%" stopColor="rgba(0, 240, 255, 0.05)" />
              <stop offset="100%" stopColor="rgba(0, 240, 255, 0.4)" />
            </linearGradient>
            
            <radialGradient id="hqGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
              <stop offset="60%" stopColor="rgba(0, 240, 255, 0.2)" />
              <stop offset="100%" stopColor="rgba(0, 240, 255, 0)" />
            </radialGradient>
          </defs>

          {/* Nodes Plotting */}
          {NODES.map(node => {
            const isHQ = node.type === 'hq';
            const isHovered = hoveredNode?.id === node.id;
            const hasAnomaly = node.anomalies > 0;
            const pulseColor = hasAnomaly 
              ? (node.anomalies > 1 ? '#ef4444' : '#f59e0b')
              : (isHQ ? '#ffffff' : '#00f0ff');
            const ringColor = hasAnomaly
              ? (node.anomalies > 1 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)')
              : 'rgba(0, 240, 255, 0.3)';

            return (
              <g 
                key={node.id} 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow Ring underlays */}
                {isHovered && (
                  <circle cx={node.x} cy={node.y} r="20" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                )}
                
                {/* Expanding ring sweep animation */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={isHQ ? "16" : "10"} 
                  fill={isHQ ? "url(#hqGlow)" : "none"} 
                  stroke={ringColor} 
                  strokeWidth="1.5"
                  className="animate-ping"
                  style={{ animationDuration: hasAnomaly ? '1.2s' : '3s' }}
                />

                {/* Core Point Dot */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={isHQ ? "6" : "4.5"} 
                  fill={pulseColor} 
                  stroke={isHQ ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.8)"}
                  strokeWidth={isHQ ? "3" : "1.5"}
                />

                {/* Node Label Text */}
                <text
                  x={node.x}
                  y={node.y - 12}
                  textAnchor="middle"
                  fill={hasAnomaly ? (node.anomalies > 1 ? '#f87171' : '#fbbf24') : '#d4d4d8'}
                  className="text-[9px] font-bold font-mono tracking-wider"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* HUD Stats Overlay */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/5 font-mono text-[9px] text-slate-400 space-y-1 select-none pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[10px] mb-1">
            <GlobeAltIcon className="h-3.5 w-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '20s' }} />
            <span>Telemetry Grid</span>
          </div>
          <div>ACTIVE PIPES: <strong className="text-white">7 BRANCHES</strong></div>
          <div>HQ LATENCY: <strong className="text-emerald-400">14MS</strong></div>
          <div>NETWORK SHIELD: <strong className="text-white">QUANTUM SAFE</strong></div>
        </div>
      </div>

      {/* Control Details Panel */}
      <div className="w-full md:w-72 bg-white/[0.01] rounded-xl border border-white/5 p-4 flex flex-col justify-between font-mono text-xs">
        <div>
          <div className="border-b border-white/5 pb-2.5 mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node Inspector</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 pulse-green"></span>
          </div>

          {hoveredNode ? (
            <div className="space-y-3.5 animate-fadeIn">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Location Identity</span>
                <strong className="text-white text-sm block mt-0.5">{hoveredNode.name}</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">IP Segment</span>
                  <span className="text-slate-300 font-semibold">{hoveredNode.ip}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">Country</span>
                  <span className="text-slate-300 font-semibold">{hoveredNode.country}</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Operational load</span>
                <span className={`inline-block mt-1 font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                  hoveredNode.load === 'Critical' 
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : hoveredNode.load === 'Suspicious'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {hoveredNode.load}
                </span>
              </div>
              {hoveredNode.anomalies > 0 && (
                <div className="p-2.5 rounded bg-red-950/20 border border-red-500/20 text-[10px] text-red-300 flex items-start gap-2">
                  <span>⚠️</span>
                  <div>
                    <strong>{hoveredNode.anomalies} Anomaly Detected.</strong> Insider threat risk score index flagged under evaluation limits.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-10">
              <GlobeAltIcon className="h-8 w-8 mx-auto text-slate-600 mb-2 animate-pulse" />
              <p className="text-[10px] leading-relaxed">
                Hover over the branch points on the grid to inspect real-time connection state, latency coordinates, and branch threat loads.
              </p>
            </div>
          )}
        </div>

        {/* Global Security Summary */}
        <div className="border-t border-white/5 pt-3 mt-4 space-y-2 text-[10px] text-slate-400">
          <div className="flex justify-between">
            <span>Threat Activity Index:</span>
            <span className="text-white font-bold">1.4 (Low)</span>
          </div>
          <div className="flex justify-between">
            <span>Secure Tunneling:</span>
            <span className="text-cyan-400 font-bold">Kyber-768 Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatRadar;
