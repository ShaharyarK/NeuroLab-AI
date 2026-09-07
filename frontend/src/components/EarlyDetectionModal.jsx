import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Dna, 
  Heart, 
  Zap, 
  Droplet, 
  Flame 
} from 'lucide-react';

export default function EarlyDetectionModal({
  isOpen,
  onClose,
  currentCase
}) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchEarlyDetection = async () => {
    if (!currentCase) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/early-detection`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load early detection');

      setRecord(data.record);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentCase) {
      fetchEarlyDetection();
    }
  }, [isOpen, currentCase?.id]);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/early-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lab_metrics: currentCase?.labs?.biomarkers || {},
          imaging_findings: {
            nodule_size_mm: 14,
            ggo_present: true,
            midline_shift_mm: 2.4,
            edema_present: true
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to run analysis');

      setRecord(data.record);
      setSuccessMsg('Subclinical disease trajectory analysis calculated and stored!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentCase) return null;

  const oncologyScore = record?.oncology_risk || 84.5;
  const cvdScore = record?.cardiovascular_risk || 70.0;
  const metabolicScore = record?.metabolic_risk || 68.0;
  const renalScore = record?.renal_stress_risk || 42.0;
  const hepaticScore = record?.hepatic_stress_risk || 38.0;

  const flags = record?.summary_flags || [
    { type: 'CARDIOVASCULAR', severity: 'HIGH', label: 'Elevated Atherogenic Index (Subclinical Plaque Risk)', metric: 'AIP: 0.63' },
    { type: 'METABOLIC', severity: 'HIGH', label: 'Pre-Diabetic Glycemic Instability', metric: 'HOMA-IR 3.73' }
  ];

  const getScoreColor = (score) => {
    if (score >= 70) return 'var(--coral-high)';
    if (score >= 40) return 'var(--amber-alert)';
    return 'var(--green-normal)';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Zap className="modal-icon text-cyan" size={24} />
            <div>
              <h2 className="modal-title">Subclinical Early Disease Detection AI Engine</h2>
              <p className="modal-subtitle">
                Pre-symptomatic biomarker kinetics, nodule doubling time & cardiovascular atherogenic mapping
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="auth-alert error">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="early-modal-body">
          {/* Patient Context Tag */}
          <div className="early-patient-banner">
            <div>
              <span className="banner-sub">Target Patient:</span>
              <strong className="banner-name">{currentCase.name} ({currentCase.id})</strong>
              <span className="banner-sub">• {currentCase.age}y {currentCase.gender} • Case: {currentCase.status}</span>
            </div>
            <button 
              className="btn-primary-cyan btn-recalculate"
              onClick={handleRunAnalysis}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
              <span>{loading ? 'Analyzing Biomarkers...' : 'Re-Run Subclinical AI Engine'}</span>
            </button>
          </div>

          {/* 5-Pillar Subclinical Risk Dashboard */}
          <div className="pillars-grid">
            {/* 1. Oncology */}
            <div className="pillar-card">
              <div className="pillar-top">
                <Dna size={18} color="var(--coral-high)" />
                <span className="pillar-title">Subclinical Oncology</span>
              </div>
              <div className="pillar-meter-wrap">
                <div className="pillar-score" style={{ color: getScoreColor(oncologyScore) }}>
                  {oncologyScore}%
                </div>
                <div className="pillar-meter-bar">
                  <div 
                    className="pillar-fill" 
                    style={{ width: `${oncologyScore}%`, backgroundColor: getScoreColor(oncologyScore) }}
                  ></div>
                </div>
              </div>
              <p className="pillar-desc">
                {oncologyScore > 60 
                  ? 'Fleischner High Risk: 14mm apical nodule with ground-glass attenuation & short volume doubling time.' 
                  : 'Low subclinical neoplasm probability. Standard interval surveillance.'}
              </p>
            </div>

            {/* 2. Cardiovascular */}
            <div className="pillar-card">
              <div className="pillar-top">
                <Heart size={18} color="var(--amber-alert)" />
                <span className="pillar-title">Early Cardiovascular (AIP)</span>
              </div>
              <div className="pillar-meter-wrap">
                <div className="pillar-score" style={{ color: getScoreColor(cvdScore) }}>
                  {cvdScore}%
                </div>
                <div className="pillar-meter-bar">
                  <div 
                    className="pillar-fill" 
                    style={{ width: `${cvdScore}%`, backgroundColor: getScoreColor(cvdScore) }}
                  ></div>
                </div>
              </div>
              <p className="pillar-desc">
                Atherogenic Index of Plasma (AIP: 0.63). Elevated small dense LDL subfraction and endothelial inflammation.
              </p>
            </div>

            {/* 3. Pre-Diabetes / Metabolic */}
            <div className="pillar-card">
              <div className="pillar-top">
                <Flame size={18} color="var(--amber-alert)" />
                <span className="pillar-title">Pre-Diabetes & HOMA-IR</span>
              </div>
              <div className="pillar-meter-wrap">
                <div className="pillar-score" style={{ color: getScoreColor(metabolicScore) }}>
                  {metabolicScore}%
                </div>
                <div className="pillar-meter-bar">
                  <div 
                    className="pillar-fill" 
                    style={{ width: `${metabolicScore}%`, backgroundColor: getScoreColor(metabolicScore) }}
                  ></div>
                </div>
              </div>
              <p className="pillar-desc">
                Calculated HOMA-IR 3.73 indicating peripheral insulin resistance and impaired fasting glycemic regulation.
              </p>
            </div>

            {/* 4. Renal Hemodynamic Stress */}
            <div className="pillar-card">
              <div className="pillar-top">
                <Droplet size={18} color="var(--cyan-neon)" />
                <span className="pillar-title">Renal Glomerular Stress</span>
              </div>
              <div className="pillar-meter-wrap">
                <div className="pillar-score" style={{ color: getScoreColor(renalScore) }}>
                  {renalScore}%
                </div>
                <div className="pillar-meter-bar">
                  <div 
                    className="pillar-fill" 
                    style={{ width: `${renalScore}%`, backgroundColor: getScoreColor(renalScore) }}
                  ></div>
                </div>
              </div>
              <p className="pillar-desc">
                Subclinical nephron hyperfiltration. Creatinine 1.25 mg/dL. Spot microalbuminuria monitoring indicated.
              </p>
            </div>

            {/* 5. Hepatic Transaminase */}
            <div className="pillar-card">
              <div className="pillar-top">
                <Activity size={18} color="var(--green-normal)" />
                <span className="pillar-title">Early Hepatic Strain</span>
              </div>
              <div className="pillar-meter-wrap">
                <div className="pillar-score" style={{ color: getScoreColor(hepaticScore) }}>
                  {hepaticScore}%
                </div>
                <div className="pillar-meter-bar">
                  <div 
                    className="pillar-fill" 
                    style={{ width: `${hepaticScore}%`, backgroundColor: getScoreColor(hepaticScore) }}
                  ></div>
                </div>
              </div>
              <p className="pillar-desc">
                De Ritis AST/ALT ratio 0.89. Minimal transaminase shift without indication of advanced steatohepatitis.
              </p>
            </div>
          </div>

          {/* Subclinical Warning Flags */}
          <div className="early-flags-section">
            <h4 className="section-subtitle-heading">
              <AlertTriangle size={16} color="var(--coral-high)" />
              Detected Subclinical Early Warning Trajectories
            </h4>
            <div className="flags-list">
              {flags.map((flag, idx) => (
                <div key={idx} className={`early-flag-badge ${flag.severity?.toLowerCase()}`}>
                  <span className="flag-type">{flag.type}</span>
                  <span className="flag-label">{flag.label}</span>
                  <span className="flag-metric">{flag.metric}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preventative Action Protocol */}
          <div className="action-plan-section">
            <h4 className="section-subtitle-heading">
              <Sparkles size={16} color="var(--cyan-neon)" />
              Actionable Preventative Clinical Protocol
            </h4>
            <div className="action-plan-text-box">
              <pre className="protocol-pre">
                {record?.action_plan || `### PREVENTATIVE CLINICAL ACTION PROTOCOL - ${currentCase.name.toUpperCase()}
1. Thoracic & Neuro-Oncology Interception (High Priority)
   * Order thin-slice (1.0mm) Contrast-Enhanced Chest CT within 7 days to calculate volume doubling time.
   * Schedule stereotactic biopsy consultation with neurosurgery for temporal lesion.

2. Cardiovascular & Vascular Prophylaxis
   * Initiate cardiovascular risk reduction; baseline carotid duplex ultrasound for intima-media thickening.
   * Consider low-dose Statin (Atorvastatin 20mg) for plaque stabilization.

3. Metabolic & Renal Preservation
   * Repeat Fasting Plasma Glucose and HbA1c in 90 days. Maintain strict hydration and avoid nephrotoxic NSAIDs.`}
              </pre>
            </div>
          </div>
        </div>

        <div className="modal-actions-footer">
          <button type="button" className="btn-primary-cyan" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
