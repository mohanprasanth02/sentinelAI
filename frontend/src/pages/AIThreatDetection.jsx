import React, { useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import RiskMeter from '../components/RiskMeter';
import { CpuChipIcon, CheckIcon, ShieldExclamationIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const AIThreatDetection = () => {
  const { token, addToast } = useAuth();

  // Slider Input States
  const [hour, setHour] = useState(9);
  const [failedLogins, setFailedLogins] = useState(0);
  const [countryChange, setCountryChange] = useState(0);
  const [deviceChange, setDeviceChange] = useState(0);
  const [vpn, setVpn] = useState(0);
  const [commandCount, setCommandCount] = useState(12);
  const [downloadedFiles, setDownloadedFiles] = useState(1);
  const [privLevel, setPrivLevel] = useState(1); // 1: Analyst, 2: Privileged, 3: Admin

  // Prediction Response States
  const [verdict, setVerdict] = useState('');
  const [score, setScore] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ml/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          login_hour: hour,
          failed_logins: failedLogins,
          country_change: countryChange,
          device_change: deviceChange,
          vpn: vpn,
          command_count: commandCount,
          downloaded_files: downloadedFiles,
          privilege_level: privLevel
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVerdict(data.verdict);
        setScore(data.anomaly_score);
        setConfidence(data.confidence);
        addToast("Model Evaluated", `Isolation Forest classification: ${data.verdict}.`, "Info");
      }
    } catch (e) {
      console.error(e);
      addToast("Predict Failure", "Failed to run Isolation Forest prediction.", "High");
    } finally {
      setLoading(false);
    }
  };

  const getVerdictStyle = (v) => {
    if (v === 'High Risk') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (v === 'Suspicious') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          AI ANOMALY RUNTIME INTERFACE
        </h2>
        <p className="text-xs text-slate-400">Evaluate feature vectors directly on the Isolation Forest insider threat machine learning pipeline.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Explanation and Features Sliders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Explanation */}
          <GlassCard delay={0.05}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-3 flex items-center gap-2">
              <CpuChipIcon className="h-5 w-5 text-purple-400" /> Isolation Forest Insider Threat Predictor
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Isolation Forest is an unsupervised algorithm that isolates anomalies in a multi-dimensional feature space instead of profiling normal data points. 
              By recursively partitioning features, it constructs binary trees. Because anomalies require fewer partitions to isolate, they appear closer to the root of the trees, resulting in noticeably shorter path lengths and higher anomaly scores.
            </p>
          </GlassCard>

          {/* Form Sliders */}
          <GlassCard delay={0.1}>
            <form onSubmit={handlePredict} className="space-y-5 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Login hour slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-bold">Login Hour</span>
                    <span className="text-cyan-400 font-bold">{hour}:00</span>
                  </div>
                  <input
                    type="range" min="0" max="23" value={hour}
                    onChange={(e) => setHour(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 block">Off-hours contribute higher default weights.</span>
                </div>

                {/* Failed logins slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-bold">Failed Login Attempts</span>
                    <span className="text-cyan-400 font-bold">{failedLogins} times</span>
                  </div>
                  <input
                    type="range" min="0" max="8" value={failedLogins}
                    onChange={(e) => setFailedLogins(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 block">&gt;= 3 attempts represents threat warning.</span>
                </div>

                {/* Command Count Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-bold">Commands Executed</span>
                    <span className="text-cyan-400 font-bold">{commandCount} commands</span>
                  </div>
                  <input
                    type="range" min="0" max="200" value={commandCount}
                    onChange={(e) => setCommandCount(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 block">Represents command size/length metrics.</span>
                </div>

                {/* Downloaded Files Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-bold">Files Downloaded</span>
                    <span className="text-cyan-400 font-bold">{downloadedFiles} files</span>
                  </div>
                  <input
                    type="range" min="0" max="500" value={downloadedFiles}
                    onChange={(e) => setDownloadedFiles(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 block">High downloads indicate potential data exfiltration.</span>
                </div>

                {/* Role/Privilege selection */}
                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block">Privilege Level Mapping</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 1, label: 'SOC Analyst' },
                      { val: 2, label: 'Privileged User' },
                      { val: 3, label: 'Super Admin' }
                    ].map((p) => (
                      <button
                        key={p.val} type="button"
                        onClick={() => setPrivLevel(p.val)}
                        className={`py-1.5 rounded-lg border font-bold transition-colors ${
                          privLevel === p.val
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40 shadow-neon-blue'
                            : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switch states */}
                <div className="grid grid-cols-3 gap-3 items-end pb-1 text-[11px] text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={countryChange === 1}
                      onChange={(e) => setCountryChange(e.target.checked ? 1 : 0)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 h-4 w-4"
                    />
                    <span>New Country</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={deviceChange === 1}
                      onChange={(e) => setDeviceChange(e.target.checked ? 1 : 0)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 h-4 w-4"
                    />
                    <span>New Device</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={vpn === 1}
                      onChange={(e) => setVpn(e.target.checked ? 1 : 0)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 h-4 w-4"
                    />
                    <span>VPN Active</span>
                  </label>
                </div>

              </div>

              {/* Predict button */}
              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold tracking-widest uppercase transition-all duration-300 shadow-neon-blue flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <span>Evaluate Anomaly Vector</span>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Prediction Outputs Panel */}
        <div className="lg:col-span-1">
          <GlassCard className="h-full flex flex-col justify-between items-center text-center p-6 border-white/5" glowColor="purple">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">Prediction Telemetry</h4>
            
            {verdict ? (
              <div className="w-full flex flex-col items-center space-y-5 my-4">
                {/* Gauge displaying anomaly score normalized percentage */}
                <RiskMeter score={score * 100} size={150} />

                <div className="space-y-3 font-mono text-left text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5 w-full">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Decision Verdict</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border mt-1 ${getVerdictStyle(verdict)}`}>
                      {verdict}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Lattice Path Score (Anomaly)</span>
                    <strong className="text-white font-bold text-sm block mt-0.5">{score.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Forest Isolation Confidence</span>
                    <strong className="text-white font-bold text-sm block mt-0.5">{Math.round(confidence * 100)}%</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 font-mono text-xs max-w-[220px] my-10 space-y-2">
                <CpuChipIcon className="h-10 w-10 text-slate-600 mx-auto animate-pulse" />
                <p>Adjust inputs on the left and trigger prediction to load Isolation Forest scores.</p>
              </div>
            )}

            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex gap-2 items-start text-left">
              <InformationCircleIcon className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-slate-400 font-mono">
                The anomaly score ranges from 0 to 1. Threshold values &gt;0.5 represent suspicious deviations, while values &gt;0.75 are flagged as High Risk threat classifications.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default AIThreatDetection;
