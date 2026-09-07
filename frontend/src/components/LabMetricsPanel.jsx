import React, { useState, useEffect } from 'react';
import { TestTube, Edit3, Plus, Check, Calendar, Trash2, Download, AlertTriangle } from 'lucide-react';
import { exportLabHistoryPdf } from '../utils/pdfGenerator';

export default function LabMetricsPanel({ currentCase, onUpdateLab, onOpenLabs, onDeleteLabsByDate }) {
  const [activeTab, setActiveTab] = useState('cbc-biomarkers');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [selectedDate, setSelectedDate] = useState('latest');
  const [confirmDeleteDate, setConfirmDeleteDate] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isSarah = currentCase?.id === 'NL0194';
  const hasLabs = Boolean(currentCase?.labs?.has_labs || isSarah);
  const allDates = currentCase?.labs?.all_dates || [];

  // Reset selectedDate if currentCase changes and date not available
  useEffect(() => {
    if (selectedDate !== 'latest' && !allDates.includes(selectedDate)) {
      setSelectedDate('latest');
    }
  }, [allDates, selectedDate]);

  // Helper to extract metric with truthful patient-specific values
  const getMetric = (category, key, defVal, defUnit, defRef, normalMin, normalMax) => {
    let categoryLabs = currentCase?.labs?.[category];
    if (selectedDate !== 'latest' && currentCase?.labs?.history_by_date) {
      const session = currentCase.labs.history_by_date.find(h => h.test_date === selectedDate);
      if (session?.panels?.[category]) {
        categoryLabs = session.panels[category];
      } else {
        categoryLabs = {};
      }
    }
    const item = categoryLabs?.[key];

    if (item !== undefined && item !== null) {
      const val = typeof item === 'object' ? item.value : item;
      const unit = typeof item === 'object' ? (item.unit ?? defUnit) : defUnit;
      const ref = typeof item === 'object' ? (item.ref ?? defRef) : defRef;
      let status = typeof item === 'object' ? (item.status ?? 'normal') : 'normal';

      if (typeof val === 'number') {
        if (normalMax !== undefined && val > normalMax) status = 'high';
        else if (normalMin !== undefined && val < normalMin) status = 'low';
      }

      return { value: val, unit, ref, status, isPending: false };
    }

    if (isSarah) {
      let status = 'normal';
      if (typeof defVal === 'number') {
        if (normalMax !== undefined && defVal > normalMax) status = 'high';
        else if (normalMin !== undefined && defVal < normalMin) status = 'low';
      }
      return { value: defVal, unit: defUnit, ref: defRef, status, isPending: false };
    }

    return { value: null, unit: defUnit, ref: defRef, status: 'pending', isPending: true };
  };

  // 1. Complete Blood Count (CBC) - 5 parameters
  const cbcMetrics = [
    { key: 'Hemoglobin', label: 'Hemoglobin (Hb)', ...getMetric('cbc', 'Hemoglobin', 12.1, 'g/dL', '12.0-17.5', 12.0, 17.5) },
    { key: 'WBC', label: 'White Blood Cell (WBC)', ...getMetric('cbc', 'WBC', 8.9, 'K/mcL', '4.5-11.0', 4.5, 11.0) },
    { key: 'Platelets', label: 'Platelets', ...getMetric('cbc', 'Platelets', 210, 'K/mcL', '150-450', 150, 450) },
    { key: 'RBC', label: 'Red Blood Cell (RBC)', ...getMetric('cbc', 'RBC', 4.2, 'M/mcL', '4.0-5.9', 4.0, 5.9) },
    { key: 'Hematocrit', label: 'Hematocrit (Hct)', ...getMetric('cbc', 'Hematocrit', 37.5, '%', '36.0-50.0', 36.0, 50.0) },
  ];

  // 2. Inflammatory & Oncology Biomarkers - 5 parameters
  const bioMetrics = [
    { key: 'hs_CRP', label: 'High-Sensitivity CRP', ...getMetric('biomarkers', 'hs_CRP', 32.0, 'mg/L', '< 5.0', 0.0, 5.0) },
    { key: 'Ferritin', label: 'Serum Ferritin', ...getMetric('biomarkers', 'Ferritin', 450, 'ng/mL', '15-200', 15, 200) },
    { key: 'LDH', label: 'Lactate Dehydrogenase', ...getMetric('biomarkers', 'LDH', 245, 'U/L', '140-220', 140, 220) },
    { key: 'CEA', label: 'Carcinoembryonic Antigen', ...getMetric('biomarkers', 'CEA', 4.8, 'ng/mL', '< 3.0', 0.0, 3.0) },
    { key: 'CA125', label: 'Cancer Antigen 125', ...getMetric('biomarkers', 'CA125', 22.0, 'U/mL', '< 35.0', 0.0, 35.0) },
  ];

  // 3. Liver Function Panel (LFT) - 5 parameters
  const lftMetricsCol1 = [
    { key: 'ALT', label: 'Alanine Aminotransferase (ALT)', ...getMetric('lft', 'ALT', 42, 'U/L', '7-56', 7, 56) },
    { key: 'AST', label: 'Aspartate Aminotransferase (AST)', ...getMetric('lft', 'AST', 38, 'U/L', '10-40', 10, 40) },
    { key: 'ALP', label: 'Alkaline Phosphatase (ALP)', ...getMetric('lft', 'ALP', 88, 'U/L', '44-147', 44, 147) },
  ];
  const lftMetricsCol2 = [
    { key: 'Total_Bilirubin', label: 'Total Bilirubin', ...getMetric('lft', 'Total_Bilirubin', 0.9, 'mg/dL', '0.1-1.2', 0.1, 1.2) },
    { key: 'Albumin', label: 'Serum Albumin', ...getMetric('lft', 'Albumin', 4.1, 'g/dL', '3.4-5.4', 3.4, 5.4) },
  ];

  // 4. Kidney Function Panel (KFT) - 5 parameters
  const kftMetricsCol1 = [
    { key: 'Serum_Creatinine', label: 'Serum Creatinine', ...getMetric('kft', 'Serum_Creatinine', 1.25, 'mg/dL', '0.6-1.2', 0.6, 1.2) },
    { key: 'BUN', label: 'Blood Urea Nitrogen (BUN)', ...getMetric('kft', 'BUN', 18, 'mg/dL', '7-20', 7, 20) },
    { key: 'eGFR', label: 'Estimated GFR (eGFR)', ...getMetric('kft', 'eGFR', 78, 'mL/min', '90-140', 90, 140) },
  ];
  const kftMetricsCol2 = [
    { key: 'Sodium', label: 'Serum Sodium (Na+)', ...getMetric('kft', 'Sodium', 140, 'mEq/L', '135-145', 135, 145) },
    { key: 'Potassium', label: 'Serum Potassium (K+)', ...getMetric('kft', 'Potassium', 4.3, 'mEq/L', '3.5-5.0', 3.5, 5.0) },
  ];

  // 5. Lipid & Atherogenic Panel - 4 parameters
  const lipidMetricsCol1 = [
    { key: 'Triglycerides', label: 'Serum Triglycerides', ...getMetric('lipid', 'Triglycerides', 240, 'mg/dL', '50-150', 50, 150) },
    { key: 'Total_Cholesterol', label: 'Total Cholesterol', ...getMetric('lipid', 'Total_Cholesterol', 218, 'mg/dL', '120-200', 120, 200) },
  ];
  const lipidMetricsCol2 = [
    { key: 'HDL', label: 'HDL Cholesterol', ...getMetric('lipid', 'HDL', 38, 'mg/dL', '40-90', 40, 90) },
    { key: 'LDL', label: 'LDL Cholesterol', ...getMetric('lipid', 'LDL', 138, 'mg/dL', '50-100', 50, 100) },
  ];

  // 6. Endocrine & Glycemic Panel - 4 parameters
  const endocrineMetricsCol1 = [
    { key: 'Fasting_Glucose', label: 'Fasting Plasma Glucose', ...getMetric('endocrine', 'Fasting_Glucose', 118, 'mg/dL', '70-99', 70, 99) },
    { key: 'HbA1c', label: 'Glycated Hb (HbA1c)', ...getMetric('endocrine', 'HbA1c', 5.9, '%', '4.0-5.6', 4.0, 5.6) },
  ];
  const endocrineMetricsCol2 = [
    { key: 'Fasting_Insulin', label: 'Fasting Insulin', ...getMetric('endocrine', 'Fasting_Insulin', 18.0, 'uIU/mL', '2.6-24.9', 2.6, 24.9) },
    { key: 'TSH', label: 'Thyroid Stimulating Hormone', ...getMetric('endocrine', 'TSH', 2.1, 'uIU/mL', '0.4-4.0', 0.4, 4.0) },
  ];

  // 7. Urinalysis - 5 parameters
  const urinalysisMetricsCol1 = [
    { key: 'Urine_Color', label: 'Urine Appearance', ...getMetric('urinalysis', 'Urine_Color', 'Amber', '', 'Straw/Yellow') },
    { key: 'Specific_Gravity', label: 'Specific Gravity', ...getMetric('urinalysis', 'Specific_Gravity', 1.020, '', '1.005-1.030', 1.005, 1.030) },
    { key: 'Urine_pH', label: 'Urine pH', ...getMetric('urinalysis', 'Urine_pH', 6.2, '', '4.5-8.0', 4.5, 8.0) },
  ];
  const urinalysisMetricsCol2 = [
    { key: 'Protein', label: 'Urine Protein', ...getMetric('urinalysis', 'Protein', 'Trace', '', 'Negative') },
    { key: 'Leukocyte_Esterase', label: 'Leukocyte Esterase', ...getMetric('urinalysis', 'Leukocyte_Esterase', 'Negative', '', 'Negative') },
  ];

  // Initialize edit values when entering edit mode
  const handleStartEdit = () => {
    setIsEditing(true);
    const initial = {};
    const populate = (items) => {
      items.forEach(item => {
        initial[item.key] = item.value ?? '';
      });
    };

    if (activeTab === 'cbc-biomarkers') {
      populate(cbcMetrics);
      populate(bioMetrics);
    } else if (activeTab === 'lft') {
      populate(lftMetricsCol1);
      populate(lftMetricsCol2);
    } else if (activeTab === 'kft') {
      populate(kftMetricsCol1);
      populate(kftMetricsCol2);
    } else if (activeTab === 'lipid') {
      populate(lipidMetricsCol1);
      populate(lipidMetricsCol2);
    } else if (activeTab === 'endocrine') {
      populate(endocrineMetricsCol1);
      populate(endocrineMetricsCol2);
    } else if (activeTab === 'urinalysis') {
      populate(urinalysisMetricsCol1);
      populate(urinalysisMetricsCol2);
    }
    setEditValues(initial);
  };

  const handleSave = async () => {
    setIsEditing(false);
    if (!onUpdateLab) return;

    let category = 'cbc';
    const metricsPayload = {};

    if (activeTab === 'cbc-biomarkers') {
      const cbcPayload = {};
      cbcMetrics.forEach(m => {
        const val = editValues[m.key] !== undefined ? parseFloat(editValues[m.key]) : m.value;
        cbcPayload[m.key] = { value: isNaN(val) ? editValues[m.key] : val, unit: m.unit, ref: m.ref, status: 'normal' };
      });
      const bioPayload = {};
      bioMetrics.forEach(m => {
        const val = editValues[m.key] !== undefined ? parseFloat(editValues[m.key]) : m.value;
        bioPayload[m.key] = { value: isNaN(val) ? editValues[m.key] : val, unit: m.unit, ref: m.ref, status: (val || 0) > 5.0 ? 'high' : 'normal' };
      });
      onUpdateLab('cbc', cbcPayload);
      onUpdateLab('biomarkers', bioPayload);

      try {
        await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'cbc', metrics: cbcPayload })
        });
        await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'biomarkers', metrics: bioPayload })
        });
      } catch (err) {
        console.warn('Could not persist labs:', err);
      }
      return;
    }

    let activeItems = [];
    if (activeTab === 'lft') {
      category = 'lft';
      activeItems = [...lftMetricsCol1, ...lftMetricsCol2];
    } else if (activeTab === 'kft') {
      category = 'kft';
      activeItems = [...kftMetricsCol1, ...kftMetricsCol2];
    } else if (activeTab === 'lipid') {
      category = 'lipid';
      activeItems = [...lipidMetricsCol1, ...lipidMetricsCol2];
    } else if (activeTab === 'endocrine') {
      category = 'endocrine';
      activeItems = [...endocrineMetricsCol1, ...endocrineMetricsCol2];
    } else if (activeTab === 'urinalysis') {
      category = 'urinalysis';
      activeItems = [...urinalysisMetricsCol1, ...urinalysisMetricsCol2];
    }

    activeItems.forEach(m => {
      const raw = editValues[m.key] !== undefined ? editValues[m.key] : m.value;
      const num = parseFloat(raw);
      metricsPayload[m.key] = {
        value: isNaN(num) ? raw : num,
        unit: m.unit,
        ref: m.ref,
        status: m.status
      };
    });

    const testDatePayload = selectedDate !== 'latest' ? selectedDate : undefined;
    onUpdateLab(category, metricsPayload);
    try {
      await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, test_date: testDatePayload, metrics: metricsPayload })
      });
    } catch (err) {
      console.warn('Could not persist labs:', err);
    }
  };

  const renderMetricRow = (m) => {
    const isHigh = m.status === 'high';
    const isLow = m.status === 'low';
    const isPending = m.isPending;

    return (
      <div className="metric-row" key={m.key}>
        <span className="metric-name" title={m.label}>
          {m.label}:
        </span>
        {isEditing ? (
          <input
            type={typeof m.value === 'number' ? 'number' : 'text'}
            step="0.1"
            value={editValues[m.key] ?? ''}
            placeholder={String(m.value ?? '')}
            onChange={(e) => setEditValues({ ...editValues, [m.key]: e.target.value })}
            className="form-input"
            style={{ width: '80px', padding: '2px 6px', textAlign: 'right' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={isPending ? "metric-value text-muted" : (isHigh ? "metric-value-high" : (isLow ? "metric-value-low" : "metric-value"))}>
              {isPending ? '--' : `${m.value} ${m.unit}`}
            </span>
            {!isPending && isHigh && <span className="metric-badge-flag metric-badge-high">[H]</span>}
            {!isPending && isLow && <span className="metric-badge-flag metric-badge-low">[L]</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="neurolab-panel pathology-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <TestTube size={16} color="var(--cyan-neon)" />
          <span>Pathology Lab Test Metrics</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="tool-icon-btn" 
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                handleStartEdit();
              }
            }}
            title={isEditing ? "Save Values" : "Edit Lab Values"}
          >
            {isEditing ? <Check size={16} color="var(--green-normal)" /> : <Edit3 size={15} />}
          </button>
          <button className="tool-icon-btn" onClick={onOpenLabs} title="Open Lab Diagnostic Suite">
            <Plus size={16} color="var(--cyan-400)" />
          </button>
        </div>
      </div>

      {/* Date Switcher & Actions Bar */}
      {allDates.length > 0 && (
        <div className="lab-date-selector-bar" style={{
          padding: '4px 10px',
          background: 'rgba(7, 14, 27, 0.7)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Calendar size={12} color="var(--cyan-neon)" />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Date:</span>

          <button
            type="button"
            className={`lab-date-pill ${selectedDate === 'latest' ? 'active' : ''}`}
            onClick={() => { setSelectedDate('latest'); setConfirmDeleteDate(false); }}
          >
            Latest
          </button>

          {allDates.map(d => (
            <button
              key={d}
              type="button"
              className={`lab-date-pill ${selectedDate === d ? 'active' : ''}`}
              onClick={() => { setSelectedDate(d); setConfirmDeleteDate(false); }}
            >
              {d}
            </button>
          ))}

          {/* If viewing historical date, allow deleting it */}
          {selectedDate !== 'latest' && (
            <button
              type="button"
              className="tool-icon-btn"
              style={{ color: '#f87171', padding: '2px 4px' }}
              onClick={() => setConfirmDeleteDate(true)}
              title={`Delete all test results for date ${selectedDate}`}
            >
              <Trash2 size={12} />
            </button>
          )}

          {/* Quick PDF Export */}
          <button
            type="button"
            className="tool-icon-btn"
            style={{ color: 'var(--cyan-neon)', marginLeft: 'auto', padding: '2px 4px' }}
            onClick={() => exportLabHistoryPdf({ currentCase, selectedDate: selectedDate === 'latest' ? null : selectedDate })}
            title="Download Pathology Lab History PDF"
          >
            <Download size={12} />
          </button>
        </div>
      )}

      {/* Date Deletion Confirmation Bar */}
      {confirmDeleteDate && selectedDate !== 'latest' && (
        <div style={{
          padding: '6px 10px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: '#fca5a5'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} color="#ef4444" /> Delete all labs for <strong>{selectedDate}</strong>?
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="lab-delete-btn"
              style={{ padding: '2px 6px', fontSize: '0.68rem', background: '#ef4444', color: '#fff' }}
              onClick={async () => {
                try {
                  const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs/date/${selectedDate}`, {
                    method: 'DELETE'
                  });
                  const data = await res.json();
                  setConfirmDeleteDate(false);
                  setSelectedDate('latest');
                  onDeleteLabsByDate && onDeleteLabsByDate(selectedDate, data.patient);
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '2px 6px', fontSize: '0.68rem' }}
              onClick={() => setConfirmDeleteDate(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="panel-body" style={{ overflowY: 'auto' }}>
        {/* Awaiting notice when no labs recorded */}
        {!hasLabs && !isEditing && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px dashed rgba(56, 189, 248, 0.35)',
            borderRadius: '6px',
            padding: '5px 12px',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--cyan-400)' }}>Specimen Order Pending:</strong> No laboratory tests recorded yet.
            </span>
            <button 
              type="button" 
              className="btn-primary-cyan" 
              style={{ fontSize: '0.7rem', padding: '3px 8px' }}
              onClick={onOpenLabs}
            >
              + Record Labs
            </button>
          </div>
        )}

        {/* Dynamic Panel Content Based on activeTab */}
        <div className="lab-metrics-grid">
          {/* TAB 1: CBC & Biomarkers */}
          {activeTab === 'cbc-biomarkers' && (
            <>
              <div>
                <div className="metric-section-title">
                  <span>Complete Blood Count (CBC) — 5 params</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {cbcMetrics.map(renderMetricRow)}
              </div>
              <div>
                <div className="metric-section-title">
                  <span>Biomarkers & Oncology — 5 params</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {bioMetrics.map(renderMetricRow)}
              </div>
            </>
          )}

          {/* TAB 2: Liver Function Panel (LFT) */}
          {activeTab === 'lft' && (
            <>
              <div>
                <div className="metric-section-title">
                  <span>Hepatic Transaminases (Enzymes)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {lftMetricsCol1.map(renderMetricRow)}
              </div>
              <div>
                <div className="metric-section-title">
                  <span>Biliary & Synthetic Function</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {lftMetricsCol2.map(renderMetricRow)}
              </div>
            </>
          )}

          {/* TAB 3: Kidney Function Panel (KFT) */}
          {activeTab === 'kft' && (
            <>
              <div>
                <div className="metric-section-title">
                  <span>Renal Clearance & GFR (3 params)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {kftMetricsCol1.map(renderMetricRow)}
              </div>
              <div>
                <div className="metric-section-title">
                  <span>Renal Electrolytes (2 params)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {kftMetricsCol2.map(renderMetricRow)}
              </div>
            </>
          )}

          {/* TAB 4: Lipid & Atherogenic Panel */}
          {activeTab === 'lipid' && (
            <>
              <div>
                <div className="metric-section-title">
                  <span>Atherogenic Lipids (2 params)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {lipidMetricsCol1.map(renderMetricRow)}
              </div>
              <div>
                <div className="metric-section-title">
                  <span>Lipoprotein Subfractions (2 params)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {lipidMetricsCol2.map(renderMetricRow)}
              </div>
            </>
          )}

          {/* TAB 5: Endocrine & Glycemic Panel */}
          {activeTab === 'endocrine' && (
            <>
              <div>
                <div className="metric-section-title">
                  <span>Glycemic Axis & HbA1c (2 params)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {endocrineMetricsCol1.map(renderMetricRow)}
              </div>
              <div>
                <div className="metric-section-title">
                  <span>Hormonal & Thyroid Axis (2 params)</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {endocrineMetricsCol2.map(renderMetricRow)}
              </div>
            </>
          )}

          {/* TAB 6: Urinalysis */}
          {activeTab === 'urinalysis' && (
            <>
              <div>
                <div className="metric-section-title">
                  <span>Physical & Chemical Properties</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {urinalysisMetricsCol1.map(renderMetricRow)}
              </div>
              <div>
                <div className="metric-section-title">
                  <span>Biochemical Screening</span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ref Range</span>
                </div>
                {urinalysisMetricsCol2.map(renderMetricRow)}
              </div>
            </>
          )}
        </div>

        {/* Panel tabs */}
        <div className="lab-tabs-bar">
          <button 
            type="button"
            className={`lab-tab-btn ${activeTab === 'cbc-biomarkers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('cbc-biomarkers'); setIsEditing(false); }}
          >
            CBC & Biomarkers
          </button>
          <button 
            type="button"
            className={`lab-tab-btn ${activeTab === 'lft' ? 'active' : ''}`}
            onClick={() => { setActiveTab('lft'); setIsEditing(false); }}
          >
            Liver Panel (LFT)
          </button>
          <button 
            type="button"
            className={`lab-tab-btn ${activeTab === 'kft' ? 'active' : ''}`}
            onClick={() => { setActiveTab('kft'); setIsEditing(false); }}
          >
            Kidney Panel (KFT)
          </button>
          <button 
            type="button"
            className={`lab-tab-btn ${activeTab === 'lipid' ? 'active' : ''}`}
            onClick={() => { setActiveTab('lipid'); setIsEditing(false); }}
          >
            Lipid Panel
          </button>
          <button 
            type="button"
            className={`lab-tab-btn ${activeTab === 'endocrine' ? 'active' : ''}`}
            onClick={() => { setActiveTab('endocrine'); setIsEditing(false); }}
          >
            Endocrine & Glycemic
          </button>
          <button 
            type="button"
            className={`lab-tab-btn ${activeTab === 'urinalysis' ? 'active' : ''}`}
            onClick={() => { setActiveTab('urinalysis'); setIsEditing(false); }}
          >
            Urinalysis
          </button>
        </div>
      </div>
    </div>
  );
}
