import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Scan, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  Eye,
  Activity
} from 'lucide-react';

export default function ScanUploaderModal({
  isOpen,
  onClose,
  currentCase,
  onScanUploaded
}) {
  const [modality, setModality] = useState('mri');
  const [bodyPart, setBodyPart] = useState('brain');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isProcessingDicom, setIsProcessingDicom] = useState(false);
  const [uploadedScanData, setUploadedScanData] = useState(null);
  const [dicomInfo, setDicomInfo] = useState(null);
  const isSarah = currentCase?.id === 'NL0194';
  const defaultDetection = isSarah 
    ? 'Detection - Glioblastoma Multiforme (Left Temporal)'
    : `Diagnostic Study — ${currentCase?.chief_complaint || 'General Workup'}`;

  const [detectionName, setDetectionName] = useState(defaultDetection);
  const [measurements, setMeasurements] = useState(isSarah ? '32mm x 28mm lesion with 2.4mm midline shift' : 'Screening baseline — no acute focal lesions');
  const [confidence, setConfidence] = useState(isSarah ? 94.7 : 92.5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !currentCase) return null;

  const handleModalityChange = (mod) => {
    setModality(mod);
    if (mod === 'mri') {
      setBodyPart('brain');
      if (!uploadedScanData) {
        setDetectionName(isSarah ? 'Detection - Glioblastoma Multiforme (Left Temporal)' : `Brain MRI (${currentCase.chief_complaint || 'Workup'})`);
        setMeasurements(isSarah ? '32mm x 28mm lesion with 2.4mm midline shift' : 'No midline shift; ventricular margins symmetric');
      }
      setConfidence(94.7);
    } else if (mod === 'cxr') {
      setBodyPart('chest');
      if (!uploadedScanData) {
        setDetectionName(isSarah ? 'Pulmonary Nodules (Right Lung Apex, 14mm)' : 'Chest Screening — Clear lung fields');
        setMeasurements(isSarah ? '14mm spiculated ground-glass opacity nodule' : 'Cardiothoracic ratio normal; costophrenic angles clear');
      }
      setConfidence(88.1);
    } else if (mod === 'ct') {
      setBodyPart('abdomen');
      if (!uploadedScanData) {
        setDetectionName('Abdominal Evaluation — Normal organ morphology');
        setMeasurements('No organomegaly or focal lesion');
      }
      setConfidence(91.2);
    } else {
      setBodyPart('extremities');
      if (!uploadedScanData) {
        setDetectionName('Musculoskeletal Evaluation — Intact bone architecture');
        setMeasurements('No cortical disruption or acute fracture');
      }
      setConfidence(96.4);
    }
  };

  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErrorMsg('');
    setUploadedScanData(null);
    setDicomInfo(null);

    const isDcm = f.name.toLowerCase().endsWith('.dcm') || f.name.toLowerCase().endsWith('.dicom') || f.type === 'application/dicom';

    if (isDcm) {
      setIsProcessingDicom(true);
      try {
        const formData = new FormData();
        formData.append('file', f);
        const upRes = await fetch('http://localhost:511/api/upload-scan-file', {
          method: 'POST',
          body: formData
        });
        const upData = await upRes.json();
        if (upRes.ok && upData.status === 'success') {
          setUploadedScanData(upData);
          setPreviewUrl(upData.url);
          if (upData.modality) {
            handleModalityChange(upData.modality);
          }
          if (upData.detection) {
            setDetectionName(upData.detection);
          }
          if (upData.measurements) {
            setMeasurements(upData.measurements);
          }
          setDicomInfo(upData.dicom_metadata || { total_slices: upData.total_slices });
        } else {
          setErrorMsg(upData.detail || 'Could not parse DICOM file');
        }
      } catch (err) {
        console.error('DICOM pre-upload error:', err);
        setErrorMsg('Error processing DICOM file on server');
      } finally {
        setIsProcessingDicom(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(f);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let finalImageUrl = previewUrl;
      let finalSeriesImages = uploadedScanData?.series_images || [];

      // If user uploaded a physical image file that hasn't been uploaded yet
      if (file && !uploadedScanData) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const upRes = await fetch('http://localhost:511/api/upload-scan-file', {
            method: 'POST',
            body: formData
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            finalImageUrl = upData.url;
            finalSeriesImages = upData.series_images || [upData.url];
          }
        } catch (upErr) {
          console.warn('File upload fallback to data URL:', upErr);
        }
      }

      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/imaging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality,
          body_part: bodyPart,
          detection: detectionName,
          confidence: parseFloat(confidence),
          measurements,
          image_url: finalImageUrl || (modality === 'mri' ? '/static/mri_preview.png' : '/static/cxr_preview.png'),
          series_images: finalSeriesImages.length > 0 ? finalSeriesImages : (finalImageUrl ? [finalImageUrl] : [])
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setSuccessMsg(`Study recorded! AI segmentation model processed.`);
      onScanUploaded && onScanUploaded(data.imaging, data.patient);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container medium-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Scan className="modal-icon text-cyan" size={24} />
            <div>
              <h2 className="modal-title">Multi-Modality Diagnostic Scan Uploader</h2>
              <p className="modal-subtitle">
                Upload MRI, Chest X-Ray, or CT Scans for real-time PyTorch & MONAI neural inference
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

        <form onSubmit={handleUpload} className="scan-upload-form">
          {/* Target Patient Badge */}
          <div className="auth-current-badge">
            <Activity size={16} color="var(--cyan-neon)" />
            <span>Uploading scan for: <strong>{currentCase.name}</strong> ({currentCase.id})</span>
          </div>

          {/* Modality Chips */}
          <div className="form-group">
            <label>Imaging Modality & Body Region</label>
            <div className="modality-chip-grid">
              <button 
                type="button" 
                className={`modality-chip ${modality === 'mri' ? 'active' : ''}`}
                onClick={() => handleModalityChange('mri')}
              >
                Brain MRI (T1/FLAIR)
              </button>
              <button 
                type="button" 
                className={`modality-chip ${modality === 'cxr' ? 'active' : ''}`}
                onClick={() => handleModalityChange('cxr')}
              >
                Chest X-Ray / CT
              </button>
              <button 
                type="button" 
                className={`modality-chip ${modality === 'ct' ? 'active' : ''}`}
                onClick={() => handleModalityChange('ct')}
              >
                Abdominal CT / Ultrasound
              </button>
              <button 
                type="button" 
                className={`modality-chip ${modality === 'bone' ? 'active' : ''}`}
                onClick={() => handleModalityChange('bone')}
              >
                Bone / Musculoskeletal
              </button>
            </div>
          </div>

          {/* File Dropzone */}
          <div className="file-dropzone-box">
            <input 
              type="file" 
              accept="image/*,.dcm,.nii,.nii.gz" 
              id="scan-file-input"
              className="hidden-file-input"
              onChange={handleFileSelect}
            />
            <label htmlFor="scan-file-input" className="dropzone-label">
              <UploadCloud size={36} color="var(--cyan-neon)" />
              {file ? (
                <div className="file-selected-text">
                  <strong>{file.name}</strong>
                  <span>({Math.round(file.size / 1024)} KB) - Click to change</span>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <strong>Click to select scan file</strong> or drag & drop here
                  <span>Supports DICOM (.dcm), NIfTI (.nii.gz), PNG, JPG</span>
                </div>
              )}
            </label>
          </div>

          {/* DICOM Processing Spinner */}
          {isProcessingDicom && (
            <div className="modal-scan-preview-wrapper" style={{ padding: '24px' }}>
              <Activity className="spin-icon" size={28} color="var(--cyan-neon)" />
              <span style={{ color: 'var(--cyan-neon)', fontSize: '0.85rem', fontWeight: 600 }}>
                Parsing DICOM header & extracting volumetric slices...
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Normalizing 16-bit pixel intensities to medical PACS viewport
              </span>
            </div>
          )}

          {/* Square Image Preview when user selects an image */}
          {previewUrl && !isProcessingDicom && (
            <div className="modal-scan-preview-wrapper">
              <div className="modal-scan-preview-square">
                <img src={previewUrl} alt="Scan preview" className="modal-scan-preview-img" />
              </div>
              <div className="modal-preview-caption">
                {uploadedScanData?.is_dicom ? (
                  <span style={{ color: 'var(--cyan-neon)', fontWeight: 600 }}>
                    DICOM Study: {uploadedScanData.total_slices} Slices Extracted ({uploadedScanData.dicom_metadata?.dimensions || 'High-Res'})
                  </span>
                ) : (
                  <span>Square Viewport Preview — Auto-Scaled to Fit</span>
                )}
              </div>
            </div>
          )}

          {/* Clinical Findings & Detection Preview */}
          <div className="form-section-card mt-3">
            <h4 className="section-title">
              <Sparkles size={16} color="var(--cyan-neon)" />
              Neural Network Detection & Findings
            </h4>

            <div className="form-group">
              <label>AI Detection Label</label>
              <input 
                type="text" 
                value={detectionName} 
                onChange={(e) => setDetectionName(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Lesion Measurements / Coordinates</label>
                <input 
                  type="text" 
                  value={measurements} 
                  onChange={(e) => setMeasurements(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Confidence Score (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="100"
                  value={confidence} 
                  onChange={(e) => setConfidence(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-actions-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-cyan" disabled={loading}>
              {loading ? 'Processing Neural Model...' : 'Upload & Run AI Segmentation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
