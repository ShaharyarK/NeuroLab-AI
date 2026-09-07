import React from 'react';
import { Gauge } from 'lucide-react';

function CircularGauge({ title, percentage, color = "var(--cyan-neon)" }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="gauge-card">
      <div className="gauge-title">{title}</div>
      <div style={{ position: 'relative', width: '96px', height: '96px' }}>
        <svg className="radial-gauge-svg" viewBox="0 0 96 96">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="gauge-bg-circle"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="gauge-progress-circle"
            style={{
              stroke: color,
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <div className="gauge-inner-text">
          {percentage}%
        </div>
      </div>
    </div>
  );
}

export default function ConfidenceGauges({ currentCase }) {
  const isSarah = currentCase?.id === 'NL0194';
  const hasMri = currentCase?.mri?.has_scan ?? isSarah;
  const hasCxr = currentCase?.cxr?.has_scan ?? isSarah;

  const malignancyRisk = hasMri ? (currentCase?.mri?.malignancy_risk ?? 0.0) : 0.0;
  const pneumoniaRisk = hasCxr ? (currentCase?.cxr?.pneumonia_score ?? 0.0) : 0.0;
  const noduleRisk = hasCxr ? (currentCase?.cxr?.segmentation_score ?? 0.0) : 0.0;

  return (
    <div className="neurolab-panel confidence-gauges-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Gauge size={16} color="var(--cyan-neon)" />
          <span style={{ fontSize: '0.85rem' }}>Diagnostic Confidence Gauges</span>
        </div>
        {!hasMri && !hasCxr && (
          <span className="badge-triage-green" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
            Baseline
          </span>
        )}
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '10px 8px' }}>
        {/* Gauge 1: Malignancy Risk (MRI) */}
        <CircularGauge 
          title="Malignancy Risk (MRI):" 
          percentage={malignancyRisk} 
          color={malignancyRisk > 50 ? "#f43f5e" : (malignancyRisk > 0 ? "var(--cyan-neon)" : "#10b981")}
        />

        {/* Gauge 2: Pneumonia (CXR) */}
        <CircularGauge 
          title="Pneumonia (CXR):" 
          percentage={pneumoniaRisk} 
          color={pneumoniaRisk > 50 ? "#f43f5e" : "var(--cyan-400)"}
        />

        {/* Gauge 3: Pulmonary Nodule (CXR) */}
        <CircularGauge 
          title="Pulmonary Nodule (CXR):" 
          percentage={noduleRisk} 
          color={noduleRisk > 50 ? "#fbbf24" : (noduleRisk > 0 ? "var(--cyan-neon)" : "#10b981")}
        />

        {!hasMri && !hasCxr && (
          <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', paddingTop: '4px' }}>
            Intake Baseline · No neoplasm detected
          </div>
        )}
      </div>
    </div>
  );
}
