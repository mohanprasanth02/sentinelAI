import React from 'react';

const RiskMeter = ({ score, size = 150 }) => {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Risk meter works on a half or 3/4 circle. Let's do a 270-degree gauge.
  // Standard full circle strokeDashoffset = circumference - (percent / 100) * circumference
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (val) => {
    if (val >= 80) return 'text-red-500';
    if (val >= 40) return 'text-amber-500';
    return 'text-emerald-400';
  };

  const getGlow = (val) => {
    if (val >= 80) return 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    if (val >= 40) return 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    return 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]';
  };

  const getThreatLabel = (val) => {
    if (val >= 80) return { label: 'CRITICAL THREAT', style: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    if (val >= 40) return { label: 'SUSPICIOUS', style: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    return { label: 'LOW RISK / NORMAL', style: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
  };

  const { label, style } = getThreatLabel(score);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          height={size}
          width={size}
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="rgba(255, 255, 255, 0.05)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Foreground active dial */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className={`${getColor(score)} ${getGlow(score)} transition-all duration-1000 ease-out`}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {/* Core Value Label Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold tracking-tight text-white">{Math.round(score)}%</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">RISK INDEX</span>
        </div>
      </div>
      
      {/* Badge classification label */}
      <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-widest ${style}`}>
        {label}
      </div>
    </div>
  );
};

export default RiskMeter;
