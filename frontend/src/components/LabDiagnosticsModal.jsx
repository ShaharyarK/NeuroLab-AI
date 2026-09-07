import React, { useState } from 'react';
import { 
  X, 
  FlaskConical, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles,
  TrendingUp,
  Activity,
  Calendar,
  Trash2,
  Download,
  Clock,
  ChevronRight,
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { exportLabHistoryPdf } from '../utils/pdfGenerator';

const LAB_PANELS = [
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    description: 'Erythrocytes, leukocytes, thrombocytes & differential',
    fields: [
      { key: 'Hemoglobin', label: 'Hemoglobin', unit: 'g/dL', normalMin: 12.0, normalMax: 17.5, def: 12.1 },
      { key: 'WBC', label: 'White Blood Cell (WBC)', unit: 'K/mcL', normalMin: 4.5, normalMax: 11.0, def: 8.9 },
      { key: 'Platelets', label: 'Platelets', unit: 'K/mcL', normalMin: 150, normalMax: 450, def: 210 },
      { key: 'RBC', label: 'Red Blood Cell (RBC)', unit: 'M/mcL', normalMin: 4.0, normalMax: 5.9, def: 4.2 },
      { key: 'Hematocrit', label: 'Hematocrit', unit: '%', normalMin: 36.0, normalMax: 50.0, def: 37.5 }
    ]
  },
  {
    id: 'biomarkers',
    name: 'Inflammatory & Oncology Biomarkers',
    description: 'Acute phase reactants, neuro-oncology & tumor markers',
    fields: [
      { key: 'hs_CRP', label: 'High-Sensitivity CRP', unit: 'mg/L', normalMin: 0.0, normalMax: 5.0, def: 32.0 },
      { key: 'Ferritin', label: 'Serum Ferritin', unit: 'ng/mL', normalMin: 15, normalMax: 200, def: 450 },
      { key: 'LDH', label: 'Lactate Dehydrogenase (LDH)', unit: 'U/L', normalMin: 140, normalMax: 220, def: 245 },
      { key: 'CEA', label: 'Carcinoembryonic Antigen (CEA)', unit: 'ng/mL', normalMin: 0.0, normalMax: 3.0, def: 4.8 },
      { key: 'CA125', label: 'Cancer Antigen 125', unit: 'U/mL', normalMin: 0.0, normalMax: 35.0, def: 22.0 }
    ]
  },
  {
    id: 'lft',
    name: 'Liver Function Panel (LFT)',
    description: 'Hepatic transaminases, biliary excretion & synthetic function',
    fields: [
      { key: 'ALT', label: 'Alanine Aminotransferase (ALT)', unit: 'U/L', normalMin: 7, normalMax: 56, def: 42 },
      { key: 'AST', label: 'Aspartate Aminotransferase (AST)', unit: 'U/L', normalMin: 10, normalMax: 40, def: 38 },
      { key: 'Total_Bilirubin', label: 'Total Bilirubin', unit: 'mg/dL', normalMin: 0.1, normalMax: 1.2, def: 0.9 },
      { key: 'ALP', label: 'Alkaline Phosphatase (ALP)', unit: 'U/L', normalMin: 44, normalMax: 147, def: 88 },
      { key: 'Albumin', label: 'Serum Albumin', unit: 'g/dL', normalMin: 3.4, normalMax: 5.4, def: 4.1 }
    ]
  },
  {
    id: 'kft',
    name: 'Kidney Function Panel (KFT)',
    description: 'Renal filtration, creatinine clearance & electrolytes',
    fields: [
      { key: 'Serum_Creatinine', label: 'Serum Creatinine', unit: 'mg/dL', normalMin: 0.6, normalMax: 1.2, def: 1.25 },
      { key: 'BUN', label: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', normalMin: 7, normalMax: 20, def: 18 },
      { key: 'eGFR', label: 'Estimated GFR', unit: 'mL/min/1.73m²', normalMin: 90, normalMax: 140, def: 78 },
      { key: 'Sodium', label: 'Serum Sodium', unit: 'mEq/L', normalMin: 135, normalMax: 145, def: 140 },
      { key: 'Potassium', label: 'Serum Potassium', unit: 'mEq/L', normalMin: 3.5, normalMax: 5.0, def: 4.3 }
    ]
  },
  {
    id: 'lipid',
    name: 'Lipid & Atherogenic Panel',
    description: 'Atherogenic particles, triglycerides & HDL subfractions',
    fields: [
      { key: 'Triglycerides', label: 'Serum Triglycerides', unit: 'mg/dL', normalMin: 50, normalMax: 150, def: 240 },
      { key: 'HDL', label: 'HDL Cholesterol', unit: 'mg/dL', normalMin: 40, normalMax: 90, def: 38 },
      { key: 'LDL', label: 'LDL Cholesterol', unit: 'mg/dL', normalMin: 50, normalMax: 100, def: 138 },
      { key: 'Total_Cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', normalMin: 120, normalMax: 200, def: 218 }
    ]
  },
  {
    id: 'endocrine',
    name: 'Endocrine & Glycemic Panel',
    description: 'Insulin resistance, fasting glucose & thyroid axis',
    fields: [
      { key: 'Fasting_Glucose', label: 'Fasting Plasma Glucose', unit: 'mg/dL', normalMin: 70, normalMax: 99, def: 118 },
      { key: 'Fasting_Insulin', label: 'Fasting Insulin', unit: 'uIU/mL', normalMin: 2.6, normalMax: 24.9, def: 18 },
      { key: 'HbA1c', label: 'Glycated Hemoglobin (HbA1c)', unit: '%', normalMin: 4.0, normalMax: 5.6, def: 5.9 },
      { key: 'TSH', label: 'Thyroid Stimulating Hormone', unit: 'uIU/mL', normalMin: 0.4, normalMax: 4.0, def: 2.1 }
    ]
  }
];

export default function LabDiagnosticsModal({
  isOpen,
  onClose,
  currentCase,
  onLabsUpdated,
  onDeleteLabRecord,
  onDeleteLabsByDate
}) {
  const [activeTab, setActiveTab] = useState('panels'); // 'panels' | 'history'
  const [selectedPanelId, setSelectedPanelId] = useState('biomarkers');
  const [panelValues, setPanelValues] = useState({});
  const [specimenDate, setSpecimenDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Confirmation state for deleting
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { type: 'record'|'date', idOrDate, label }
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !currentCase) return null;

  const currentPanel = LAB_PANELS.find(p => p.id === selectedPanelId) || LAB_PANELS[0];
  const historyList = currentCase?.labs?.history_by_date || [];
  const totalRecords = currentCase?.labs?.records?.length || 0;

  const handleFieldChange = (key, val) => {
    setPanelValues({
      ...panelValues,
      [key]: val
    });
  };

  const setPresetDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSpecimenDate(d.toISOString().split('T')[0]);
  };

  const handleSubmitPanel = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const metrics = {};
      const abnormalFlags = [];

      currentPanel.fields.forEach(f => {
        const rawVal = panelValues[f.key] !== undefined ? panelValues[f.key] : f.def;
        const numVal = parseFloat(rawVal);
        let status = 'normal';

        if (!isNaN(numVal)) {
          if (numVal > f.normalMax) {
            status = 'high';
            abnormalFlags.push(`Elevated ${f.label} (${numVal} ${f.unit} > ${f.normalMax})`);
          } else if (numVal < f.normalMin) {
            status = 'low';
            abnormalFlags.push(`Low ${f.label} (${numVal} ${f.unit} < ${f.normalMin})`);
          }
        }

        metrics[f.key] = {
          value: isNaN(numVal) ? rawVal : numVal,
          unit: f.unit,
          status,
          ref: `${f.normalMin}-${f.normalMax}`
        };
      });

      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: currentPanel.id,
          test_date: specimenDate,
          metrics,
          abnormal_flags: abnormalFlags
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit lab record');

      setSuccessMsg(`${currentPanel.name} on ${specimenDate} recorded successfully!`);
      onLabsUpdated && onLabsUpdated(currentPanel.id, metrics, data.patient);
      setTimeout(() => {
        setSuccessMsg('');
      }, 3500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    setIsDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (deleteConfirmation.type === 'record') {
        const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs/${deleteConfirmation.idOrDate}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to delete lab record');
        setSuccessMsg(`Lab record deleted successfully.`);
        onDeleteLabRecord && onDeleteLabRecord(deleteConfirmation.idOrDate, data.patient);
      } else if (deleteConfirmation.type === 'date') {
        const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/labs/date/${deleteConfirmation.idOrDate}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to delete lab records for date');
        setSuccessMsg(`Deleted all lab records for date ${deleteConfirmation.idOrDate}.`);
        onDeleteLabsByDate && onDeleteLabsByDate(deleteConfirmation.idOrDate, data.patient);
      }
      setDeleteConfirmation(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportFullPdf = () => {
    try {
      setIsExportingPdf(true);
      exportLabHistoryPdf({ currentCase });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportDatePdf = (dateStr) => {
    try {
      setIsExportingPdf(true);
      exportLabHistoryPdf({ currentCase, selectedDate: dateStr });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '980px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <FlaskConical className="modal-icon text-cyan" size={24} />
            <div>
              <h2 className="modal-title">Comprehensive Laboratory Testing Suite</h2>
              <p className="modal-subtitle">
                Longitudinal pathology, hematology, metabolic panels & date history for {currentCase.name} ({currentCase.id})
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="lab-modal-tabs">
          <div className="lab-modal-tab-group">
            <button 
              className={`lab-modal-tab-btn ${activeTab === 'panels' ? 'active' : ''}`}
              onClick={() => { setActiveTab('panels'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              <Plus size={15} />
              <span>Record New Lab Panel</span>
            </button>
            <button 
              className={`lab-modal-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => { setActiveTab('history'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              <Calendar size={15} />
              <span>📅 Lab History by Date</span>
              <span className="metric-badge-flag" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--cyan-neon)', padding: '1px 6px' }}>
                {historyList.length} Sessions
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="lab-export-btn"
              onClick={handleExportFullPdf}
              disabled={isExportingPdf}
              title="Download full publication-grade Pathology Dossier (.pdf)"
            >
              {isExportingPdf ? <Loader2 size={13} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
              <span>Export Full Lab PDF</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="auth-alert error" style={{ margin: '10px 18px 0' }}>
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success" style={{ margin: '10px 18px 0' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Delete Confirmation Alert Modal Overlay */}
        {deleteConfirmation && (
          <div style={{
            margin: '12px 18px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fca5a5' }}>
                  Confirm Deletion of {deleteConfirmation.label}?
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  This will permanently delete this laboratory result from the patient chart and recalculate history.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="lab-delete-btn"
                style={{ padding: '6px 14px', fontSize: '0.75rem', background: '#ef4444', color: '#fff' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
              <button 
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                onClick={() => setDeleteConfirmation(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: RECORD NEW LAB PANEL */}
        {activeTab === 'panels' && (
          <div className="lab-suite-layout">
            {/* Panel Selector Sidebar */}
            <div className="lab-panels-nav">
              <span className="panel-nav-title">Diagnostic Panels</span>
              {LAB_PANELS.map(p => (
                <button 
                  key={p.id}
                  className={`panel-nav-btn ${selectedPanelId === p.id ? 'active' : ''}`}
                  onClick={() => { setSelectedPanelId(p.id); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  <FlaskConical size={15} />
                  <div className="panel-nav-text">
                    <span className="panel-btn-name">{p.name}</span>
                    <span className="panel-btn-sub">{p.fields.length} parameters</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Panel Parameters Form */}
            <div className="lab-panel-editor">
              <div className="panel-editor-header">
                <div>
                  <h3 className="editor-title">{currentPanel.name}</h3>
                  <p className="editor-desc">{currentPanel.description}</p>
                </div>
                <span className="specimen-badge">Specimen: Serum / Whole Blood</span>
              </div>

              {/* Specimen Date Selection Bar */}
              <div className="lab-specimen-date-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="var(--cyan-neon)" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#fff' }}>Specimen Date:</span>
                  <input 
                    type="date"
                    value={specimenDate}
                    onChange={(e) => setSpecimenDate(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      background: '#070e1b',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.76rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                    required
                  />
                </div>
                <div className="lab-date-presets">
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
                  <button type="button" className="lab-date-preset-btn" onClick={() => setPresetDate(0)}>Today</button>
                  <button type="button" className="lab-date-preset-btn" onClick={() => setPresetDate(1)}>Yesterday</button>
                  <button type="button" className="lab-date-preset-btn" onClick={() => setPresetDate(7)}>1 Wk Ago</button>
                  <button type="button" className="lab-date-preset-btn" onClick={() => setPresetDate(30)}>1 Mo Ago</button>
                </div>
              </div>

              <form onSubmit={handleSubmitPanel} className="lab-values-form">
                <div className="lab-fields-grid">
                  {currentPanel.fields.map(f => {
                    const currentVal = panelValues[f.key] !== undefined ? panelValues[f.key] : f.def;
                    const numVal = parseFloat(currentVal);
                    const isHigh = !isNaN(numVal) && numVal > f.normalMax;
                    const isLow = !isNaN(numVal) && numVal < f.normalMin;

                    return (
                      <div key={f.key} className={`lab-field-card ${isHigh ? 'is-high' : isLow ? 'is-low' : ''}`}>
                        <div className="lab-field-header">
                          <label className="field-label">{f.label}</label>
                          <span className="ref-range">Ref: {f.normalMin} - {f.normalMax} {f.unit}</span>
                        </div>
                        <div className="lab-field-input-row">
                          <input 
                            type="number" 
                            step="any"
                            value={currentVal}
                            onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            required
                          />
                          <span className="field-unit">{f.unit}</span>
                        </div>
                        <div className="field-status-tag">
                          {isHigh ? (
                            <span className="status-elevated">ELEVATED [HIGH]</span>
                          ) : isLow ? (
                            <span className="status-low">BELOW RANGE [LOW]</span>
                          ) : (
                            <span className="status-normal">NORMAL</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="editor-actions-row">
                  <button type="submit" className="btn-primary-cyan" disabled={loading}>
                    <Plus size={16} />
                    <span>{loading ? 'Recording Panel...' : `Record ${currentPanel.name} on ${specimenDate}`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: LAB HISTORY BY DATE */}
        {activeTab === 'history' && (
          <div className="lab-history-container">
            <div className="lab-history-header-bar">
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                  Chronological Laboratory History
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {historyList.length} test session{historyList.length === 1 ? '' : 's'} on record · {totalRecords} panel records tracked
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-secondary"
                  onClick={() => setActiveTab('panels')}
                  style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                >
                  <Plus size={13} />
                  <span>Add New Date Test</span>
                </button>
              </div>
            </div>

            {historyList.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                gap: '12px'
              }}>
                <Calendar size={36} color="var(--border-subtle)" />
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>No Laboratory History on Record</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Click "Record New Lab Panel" to add test results date by date.</div>
                </div>
                <button 
                  className="btn-primary-cyan"
                  onClick={() => setActiveTab('panels')}
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={14} />
                  <span>Record First Lab Panel</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {historyList.map((session, sIdx) => {
                  const abnormalCount = session.total_abnormal || session.abnormal_flags?.length || 0;
                  const records = session.records || [];

                  return (
                    <div key={session.test_date || sIdx} className="lab-date-session-card">
                      {/* Session Header */}
                      <div className="lab-date-session-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Calendar size={16} color="var(--cyan-neon)" />
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginRight: '8px' }}>
                              {new Date(session.test_date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </span>
                            <span className="metric-badge-flag" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
                              {session.test_date}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                            <span className="metric-badge-flag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan-neon)' }}>
                              {records.length} Panel{records.length === 1 ? '' : 's'}
                            </span>
                            {abnormalCount > 0 ? (
                              <span className="metric-badge-flag metric-badge-high" style={{ padding: '2px 8px' }}>
                                ⚠ {abnormalCount} Abnormal Marker{abnormalCount === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span className="metric-badge-flag metric-badge-normal" style={{ padding: '2px 8px' }}>
                                ✓ Normal Limits
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date Session Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            className="lab-export-btn"
                            onClick={() => handleExportDatePdf(session.test_date)}
                            disabled={isExportingPdf}
                            title={`Download PDF for date ${session.test_date}`}
                          >
                            <Download size={12} />
                            <span>Export Date PDF</span>
                          </button>

                          <button 
                            className="lab-delete-btn"
                            onClick={() => setDeleteConfirmation({
                              type: 'date',
                              idOrDate: session.test_date,
                              label: `All Labs on Date ${session.test_date} (${records.length} panels)`
                            })}
                            title="Delete all lab panels recorded on this date"
                          >
                            <Trash2 size={12} />
                            <span>Delete Date</span>
                          </button>
                        </div>
                      </div>

                      {/* Session Body: List of Records */}
                      <div className="lab-date-session-body">
                        {records.map((rec, rIdx) => {
                          const catUpper = (rec.category || 'Panel').toUpperCase();
                          const metrics = rec.metrics || {};
                          const flags = rec.abnormal_flags || [];

                          return (
                            <div key={rec.id || rIdx} className="lab-record-row">
                              <div className="lab-record-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FlaskConical size={14} color="var(--cyan-neon)" />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                                    {catUpper} Panel
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                    ID #{rec.id || 'N/A'}
                                  </span>
                                </div>

                                <button 
                                  className="lab-delete-btn"
                                  onClick={() => setDeleteConfirmation({
                                    type: 'record',
                                    idOrDate: rec.id,
                                    label: `${catUpper} Panel (ID #${rec.id})`
                                  })}
                                  title="Delete this specific panel record"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete Panel</span>
                                </button>
                              </div>

                              {/* Metrics Grid */}
                              <div className="lab-metrics-chips-grid">
                                {Object.entries(metrics).map(([mKey, mVal]) => {
                                  const val = typeof mVal === 'object' ? mVal.value : mVal;
                                  const unit = typeof mVal === 'object' ? (mVal.unit || '') : '';
                                  const ref = typeof mVal === 'object' ? (mVal.ref || '') : '';
                                  const status = typeof mVal === 'object' ? (mVal.status || 'normal') : 'normal';

                                  const isHigh = status === 'high' || status === 'elevated';
                                  const isLow = status === 'low';

                                  return (
                                    <div key={mKey} className={`lab-metric-chip ${isHigh ? 'is-high' : isLow ? 'is-low' : ''}`}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                          {mKey}
                                        </span>
                                        {isHigh && <span className="status-elevated" style={{ fontSize: '0.6rem', fontWeight: 700 }}>HIGH</span>}
                                        {isLow && <span className="status-low" style={{ fontSize: '0.6rem', fontWeight: 700 }}>LOW</span>}
                                      </div>
                                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isHigh ? 'var(--coral-high)' : isLow ? 'var(--cyan-400)' : '#fff' }}>
                                        {val} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>{unit}</span>
                                      </div>
                                      {ref && (
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                          Ref: {ref}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Abnormal Flags Alert if any */}
                              {flags.length > 0 && (
                                <div style={{
                                  padding: '4px 8px',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  borderLeft: '2px solid #ef4444',
                                  borderRadius: '3px',
                                  fontSize: '0.68rem',
                                  color: '#fca5a5'
                                }}>
                                  {flags.join(' · ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions-footer">
          <button type="button" className="btn-primary-cyan" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
