import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MriAnalysisPanel from './components/MriAnalysisPanel';
import XrayInsightPanel from './components/XrayInsightPanel';
import LabMetricsPanel from './components/LabMetricsPanel';
import ConfidenceGauges from './components/ConfidenceGauges';
import ReportPreview from './components/ReportPreview';
import CasesModal from './components/CasesModal';
import SettingsModal from './components/SettingsModal';
import ClinicalCopilotDrawer from './components/ClinicalCopilotDrawer';
import AuthModal from './components/AuthModal';
import NewPatientModal from './components/NewPatientModal';
import ConsultantsModal from './components/ConsultantsModal';
import FamilyHierarchyModal from './components/FamilyHierarchyModal';
import EarlyDetectionModal from './components/EarlyDetectionModal';
import LabDiagnosticsModal from './components/LabDiagnosticsModal';
import ScanUploaderModal from './components/ScanUploaderModal';

export default function App() {
  // Doctor Auth State
  const [currentDoctor, setCurrentDoctor] = useState(() => {
    const saved = localStorage.getItem('neurolab_doctor');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      id: 1,
      username: 'dr_chen',
      full_name: 'Dr. A. Chen, MD',
      specialty: 'Neuro-Radiology & Oncology',
      license_number: 'MD-89210',
      hospital_affiliation: 'St. Jude Neuro-Diagnostics Center',
      role: 'lead_physician'
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('neurolab_token') || '');

  // Patients & Doctors Directory State
  const [patients, setPatients] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [currentCase, setCurrentCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals Visibility State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isConsultantsOpen, setIsConsultantsOpen] = useState(false);
  const [isFamilyOpen, setIsFamilyOpen] = useState(false);
  const [isEarlyDetectionOpen, setIsEarlyDetectionOpen] = useState(false);
  const [isLabsOpen, setIsLabsOpen] = useState(false);
  const [isScanUploaderOpen, setIsScanUploaderOpen] = useState(false);
  const [isCasesOpen, setIsCasesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Model & LLM Settings State
  const [llmSettings, setLlmSettings] = useState(() => {
    const saved = localStorage.getItem('neurolab_llm_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      provider: 'huggingface',
      hfToken: import.meta.env?.VITE_HF_TOKEN || '',
      modelName: 'Qwen/Qwen2.5-72B-Instruct',
      ollamaUrl: 'http://localhost:11434',
      temperature: 0.2,
      confidenceThreshold: 90
    };
  });

  // LLM Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');
  const [reportProviderInfo, setReportProviderInfo] = useState('');
  const [reportError, setReportError] = useState('');

  // Fetch doctors and patients from PostgreSQL backend
  const fetchDoctors = async () => {
    try {
      const res = await fetch('http://localhost:511/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setAllDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    }
  };

  const fetchPatients = async (selectedId = null) => {
    try {
      const res = await fetch('http://localhost:511/api/patients');
      if (res.ok) {
        const data = await res.json();
        const pts = data.patients || [];
        setPatients(pts);

        if (pts.length > 0) {
          if (selectedId) {
            const match = pts.find(p => p.id === selectedId);
            if (match) setCurrentCase(formatPatientCase(match));
          } else if (!currentCase) {
            setCurrentCase(formatPatientCase(pts[0]));
          }
        }
      }
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  };

  // Format patient case preserving specific diagnostic imaging and lab data
  const formatPatientCase = (p) => {
    if (!p) return null;
    const isSarah = p.id === 'NL0194';

    return {
      ...p,
      physician: p.attending_doctor?.full_name || 'Dr. A. Chen, MD',
      mri: p.mri || (isSarah ? {
        status: "ready",
        has_scan: true,
        detection: "Detection - Glioblastoma Multiforme",
        modality: "Brain MRI (T1+Gd / FLAIR)",
        location: "Left Temporal Lobe (32mm x 28mm)",
        malignancy_risk: 94.7,
        edema: "Marked vasogenic edema with 2.4mm midline shift"
      } : {
        status: "pending",
        has_scan: false,
        detection: `Awaiting Study — Chief Complaint: ${p.chief_complaint || 'Diagnostic Workup'}`,
        modality: "Brain MRI (Study Pending)",
        location: "Awaiting Scan Upload",
        malignancy_risk: 0.0,
        edema: "N/A - Pending Diagnostic Study"
      }),
      cxr: p.cxr || (isSarah ? {
        status: "ready",
        has_scan: true,
        detection: "Pulmonary Nodules (Right Lung Apex, 14mm)",
        modality: "Chest X-Ray / CT",
        segmentation_score: 88.1,
        pneumonia_score: 12.3,
        location: "Right Upper Lobe / Apex"
      } : {
        status: "pending",
        has_scan: false,
        detection: "Awaiting Study — Chest Imaging Pending Upload",
        modality: "Chest X-Ray (Study Pending)",
        segmentation_score: 0.0,
        pneumonia_score: 0.0,
        location: "Awaiting Scan Upload"
      }),
      labs: p.labs || (isSarah ? {
        has_labs: true,
        cbc: {
          Hemoglobin: { value: 12.1, unit: "g/dL", status: "normal" },
          WBC: { value: 8.9, unit: "K/mcL", status: "normal" },
          Platelets: { value: 210, unit: "K/mcL", status: "normal" }
        },
        biomarkers: {
          CRP: { value: 32, unit: "mg/L", status: "high", ref: "< 5.0" },
          Ferritin: { value: 450, unit: "ng/mL", status: "high", ref: "15-150" },
          LDH: { value: 245, unit: "U/L", status: "high", ref: "140-220" }
        }
      } : {
        has_labs: false,
        status: "pending_order",
        cbc: {},
        biomarkers: {}
      })
    };
  };

  useEffect(() => {
    fetchDoctors();
    fetchPatients('NL0194');
  }, []);

  // Handlers
  const handleSelectCase = (caseObj) => {
    setCurrentCase(formatPatientCase(caseObj));
    setGeneratedReport('');
    setReportError('');
  };

  const handleSelectPatientById = async (patientId) => {
    try {
      const res = await fetch(`http://localhost:511/api/patients/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentCase(formatPatientCase(data.patient));
        setGeneratedReport('');
        setReportError('');
      } else {
        fetchPatients(patientId);
      }
    } catch (e) {
      fetchPatients(patientId);
    }
  };

  const handlePatientAdmitted = (newPatient) => {
    const formatted = formatPatientCase(newPatient);
    setPatients(prev => [formatted, ...prev]);
    setCurrentCase(formatted);
    setGeneratedReport('');
    fetchPatients(newPatient.id);
  };

  const handleCareTeamUpdated = (updatedConsultants) => {
    if (currentCase) {
      setCurrentCase({
        ...currentCase,
        consulting_doctors: updatedConsultants
      });
      fetchPatients(currentCase.id);
    }
  };

  const handleFamilyUpdated = (updatedFamily) => {
    if (currentCase) {
      setCurrentCase({
        ...currentCase,
        family_members: updatedFamily
      });
      fetchPatients(currentCase.id);
    }
  };

  const handleLabsUpdated = (category, metrics, updatedPatient = null) => {
    if (updatedPatient) {
      const formatted = formatPatientCase(updatedPatient);
      setCurrentCase(formatted);
      setPatients(prev => prev.map(p => p.id === formatted.id ? formatted : p));
      return;
    }
    if (currentCase) {
      const updatedLabs = { ...(currentCase.labs || {}), has_labs: true, status: "completed" };
      updatedLabs[category] = { ...(updatedLabs[category] || {}), ...metrics };
      setCurrentCase(prev => ({
        ...prev,
        labs: updatedLabs
      }));
      fetchPatients(currentCase.id);
    }
  };

  const handleDeleteLabRecord = (labId, updatedPatient = null) => {
    if (updatedPatient) {
      const formatted = formatPatientCase(updatedPatient);
      setCurrentCase(formatted);
      setPatients(prev => prev.map(p => p.id === formatted.id ? formatted : p));
    } else if (currentCase) {
      handleSelectPatientById(currentCase.id);
    }
  };

  const handleDeleteLabsByDate = (testDate, updatedPatient = null) => {
    if (updatedPatient) {
      const formatted = formatPatientCase(updatedPatient);
      setCurrentCase(formatted);
      setPatients(prev => prev.map(p => p.id === formatted.id ? formatted : p));
    } else if (currentCase) {
      handleSelectPatientById(currentCase.id);
    }
  };

  const handleScanUploaded = (imagingRecord, updatedPatient = null) => {
    if (updatedPatient) {
      const formatted = formatPatientCase(updatedPatient);
      setCurrentCase(formatted);
      setPatients(prev => prev.map(p => p.id === formatted.id ? formatted : p));
      return;
    }
    if (currentCase) {
      if (imagingRecord.modality === 'mri') {
        setCurrentCase(prev => ({
          ...prev,
          mri: {
            status: "ready",
            has_scan: true,
            detection: imagingRecord.detection,
            modality: `Brain MRI (${imagingRecord.measurements || 'Diagnostic'})`,
            location: imagingRecord.measurements || "Intracranial Region",
            malignancy_risk: imagingRecord.confidence || 92.0,
            edema: imagingRecord.confidence > 50 ? "Vasogenic edema / mass effect" : "No edema detected",
            image_url: imagingRecord.image_url
          }
        }));
      } else {
        setCurrentCase(prev => ({
          ...prev,
          cxr: {
            status: "ready",
            has_scan: true,
            detection: imagingRecord.detection,
            modality: "Chest X-Ray / CT",
            segmentation_score: imagingRecord.confidence || 88.0,
            pneumonia_score: 14.0,
            location: imagingRecord.measurements || "Thoracic Field",
            image_url: imagingRecord.image_url
          }
        }));
      }
      fetchPatients(currentCase.id);
    }
  };

  const handleLoginSuccess = (doctorData, authToken) => {
    setCurrentDoctor(doctorData);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('neurolab_doctor');
    localStorage.removeItem('neurolab_token');
    setCurrentDoctor(null);
    setToken('');
    setIsAuthOpen(true);
  };

  // Generate Comprehensive Clinical Diagnostic Report via Hugging Face LLM
  const handleGenerateReport = async () => {
    if (!currentCase) return;
    setIsGeneratingReport(true);
    setReportError('');

    try {
      const payload = {
        patient: {
          id: currentCase.id,
          name: currentCase.name,
          age: currentCase.age,
          gender: currentCase.gender,
          status: currentCase.status || currentCase.case_status,
          chief_complaint: currentCase.chief_complaint,
          physician: currentCase.attending_doctor?.full_name || currentCase.physician,
          family_members: currentCase.family_members?.map(f => `${f.relationship_type}: ${f.related_patient?.name || f.related_patient_id}`)
        },
        imaging_findings: {
          mri: currentCase.mri,
          cxr: currentCase.cxr
        },
        lab_results: currentCase.labs,
        provider: llmSettings.provider,
        model_name: llmSettings.modelName,
        hf_token: llmSettings.hfToken,
        ollama_url: llmSettings.ollamaUrl
      };

      const res = await fetch('http://localhost:511/api/llm/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to generate report');
      }

      const data = await res.json();
      setGeneratedReport(data.report);
      setReportProviderInfo(`${data.provider.toUpperCase()} (${data.model})`);
    } catch (err) {
      console.error("Report generation error:", err);
      setReportError(err.message || 'Report generation failed');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="app-container">
      {/* Universal Header with Clinical Action Bar & Doctor Menu */}
      <Header
        currentCase={currentCase}
        currentDoctor={currentDoctor}
        onOpenCases={() => setIsCasesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNewPatient={() => setIsNewPatientOpen(true)}
        onOpenConsultants={() => setIsConsultantsOpen(true)}
        onOpenFamily={() => setIsFamilyOpen(true)}
        onOpenEarlyDetection={() => setIsEarlyDetectionOpen(true)}
        onOpenLabs={() => setIsLabsOpen(true)}
        onOpenScanUploader={() => setIsScanUploaderOpen(true)}
        onLogout={handleLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main 4-Quadrant & HUD Clinical Dashboard matching neuroLabAI.png */}
      <main className="main-dashboard-grid">
        {/* Panel 1: Brain MRI Multi-View (Top Left: Col 1, Row 1) */}
        <MriAnalysisPanel
          currentCase={currentCase}
          onOpenScanUploader={() => setIsScanUploaderOpen(true)}
        />

        {/* Panel 2: AI Insight Chest X-Ray / CT (Top Center: Col 2, Row 1) */}
        <XrayInsightPanel
          currentCase={currentCase}
          onOpenScanUploader={() => setIsScanUploaderOpen(true)}
        />

        {/* Panel 3: Diagnostic Confidence Gauges (Right Col 1: Col 3, Row 1-2) */}
        <ConfidenceGauges currentCase={currentCase} />

        {/* Panel 4: Patient Report Preview (Right Col 2: Col 4, Row 1-2) */}
        <ReportPreview
          currentCase={currentCase}
          reportData={generatedReport ? { report: generatedReport } : null}
          isGenerating={isGeneratingReport}
          onGenerateReport={handleGenerateReport}
          providerInfo={reportProviderInfo}
          error={reportError}
        />

        {/* Panel 5: Pathology Lab Test Metrics (Bottom Left/Center: Cols 1-2, Row 2) */}
        <LabMetricsPanel
          currentCase={currentCase}
          onUpdateLab={handleLabsUpdated}
          onOpenLabs={() => setIsLabsOpen(true)}
          onDeleteLabsByDate={handleDeleteLabsByDate}
        />
      </main>

      {/* Slide-out Clinical AI Copilot Drawer */}
      <ClinicalCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        currentCase={currentCase}
        settings={llmSettings}
        llmSettings={llmSettings}
      />

      {/* Doctor Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentDoctor={currentDoctor}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Admit New Patient Modal (with Family Linking) */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onPatientAdmitted={handlePatientAdmitted}
        allDoctors={allDoctors}
        existingPatients={patients}
        currentDoctor={currentDoctor}
      />

      {/* Multi-Doctor Care Team Collaboration Modal */}
      <ConsultantsModal
        isOpen={isConsultantsOpen}
        onClose={() => setIsConsultantsOpen(false)}
        currentCase={currentCase}
        allDoctors={allDoctors}
        onCareTeamUpdated={handleCareTeamUpdated}
      />

      {/* Patient Family & Lineage Hierarchy Modal */}
      <FamilyHierarchyModal
        isOpen={isFamilyOpen}
        onClose={() => setIsFamilyOpen(false)}
        currentCase={currentCase}
        allPatients={patients}
        onSelectPatient={handleSelectPatientById}
        onFamilyUpdated={handleFamilyUpdated}
      />

      {/* Subclinical Early Disease Detection AI Engine Modal */}
      <EarlyDetectionModal
        isOpen={isEarlyDetectionOpen}
        onClose={() => setIsEarlyDetectionOpen(false)}
        currentCase={currentCase}
      />

      {/* Full Laboratory Diagnostic Suite Modal */}
      <LabDiagnosticsModal
        isOpen={isLabsOpen}
        onClose={() => setIsLabsOpen(false)}
        currentCase={currentCase}
        onLabsUpdated={handleLabsUpdated}
        onDeleteLabRecord={handleDeleteLabRecord}
        onDeleteLabsByDate={handleDeleteLabsByDate}
      />

      {/* Multi-Modality Diagnostic Scan Uploader Modal */}
      <ScanUploaderModal
        isOpen={isScanUploaderOpen}
        onClose={() => setIsScanUploaderOpen(false)}
        currentCase={currentCase}
        onScanUploaded={handleScanUploaded}
      />

      {/* Patient Cases Directory Modal */}
      <CasesModal
        isOpen={isCasesOpen}
        onClose={() => setIsCasesOpen(false)}
        cases={patients}
        activeCaseId={currentCase?.id}
        currentDoctor={currentDoctor}
        onSelectCase={handleSelectCase}
        onOpenNewPatient={() => setIsNewPatientOpen(true)}
      />

      {/* Settings Modal (LLM configuration) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={llmSettings}
        onSaveSettings={(newSettings) => {
          setLlmSettings(newSettings);
          localStorage.setItem('neurolab_llm_settings', JSON.stringify(newSettings));
        }}
      />
    </div>
  );
}
