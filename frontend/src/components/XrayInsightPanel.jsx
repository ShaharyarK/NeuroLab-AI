import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Crosshair, 
  UploadCloud,
  FileCheck
} from 'lucide-react';
import { getChestXrayGradCam } from '../utils/medicalImages';

export default function XrayInsightPanel({ currentCase, onOpenScanUploader }) {
  const isSarah = currentCase?.id === 'NL0194';
  const hasCxr = currentCase?.cxr?.has_scan ?? isSarah;

  const [zoom, setZoom] = useState(1);
  const [showHeatmap, setShowHeatmap] = useState(isSarah);
  const [showBbox, setShowBbox] = useState(isSarah);

  useEffect(() => {
    setShowHeatmap(hasCxr);
    setShowBbox(hasCxr);
  }, [currentCase?.id, hasCxr]);

  const cxrDetection = currentCase?.cxr?.detection || (isSarah ? 'Pulmonary Nodules (Right Lung Apex, 14mm)' : `Awaiting Chest Study — Ingestion Pending`);
  const score = hasCxr 
    ? (currentCase?.cxr?.segmentation_score ? (currentCase.cxr.segmentation_score / 100).toFixed(2) : '0.88')
    : '0.00';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.8));
  const handleReset = () => setZoom(1);

  return (
    <div className="neurolab-panel cxr-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <Crosshair size={16} color="var(--cyan-neon)" />
          <span>AI Insight: {hasCxr ? 'Segmented' : 'Awaiting Study'}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {hasCxr && (
            <button 
              className="tool-icon-btn" 
              onClick={() => setShowHeatmap(!showHeatmap)}
              title={showHeatmap ? "Hide Grad-CAM Heatmap" : "Show Grad-CAM Heatmap"}
            >
              {showHeatmap ? <Eye size={15} color="var(--cyan-neon)" /> : <EyeOff size={15} />}
            </button>
          )}
        </div>
      </div>

      <div className="panel-body">
        {/* Segmentation Tag Banner */}
        <div className="segmentation-tag">
          <span>{hasCxr ? `AI Segmentation: ${cxrDetection}, Score: ${score}` : `AI Status: ${cxrDetection}`}</span>
        </div>

        {/* Viewport with Floating Controls */}
        <div className="xray-viewport-container">
          {hasCxr ? (
            <>
              <div 
                style={{ 
                  transform: `scale(${zoom})`, 
                  transition: 'transform 0.2s ease', 
                  width: '100%', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img 
                  src={currentCase?.cxr?.image_url || currentCase?.cxr?.series_images?.[0] || getChestXrayGradCam(showHeatmap ? 0.85 : 0.0, showBbox)} 
                  alt="Chest X-Ray Segmentation" 
                  className="xray-main-img"
                  onError={(e) => {
                    if (isSarah) {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getChestXrayGradCam(showHeatmap ? 0.85 : 0.0, showBbox);
                    }
                  }}
                />
              </div>

              {/* Floating Viewport Toolbar on Top Right */}
              <div className="viewport-floating-tools">
                <button className="tool-icon-btn" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn size={14} />
                </button>
                <button className="tool-icon-btn" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut size={14} />
                </button>
                <button className="tool-icon-btn" onClick={handleReset} title="Reset View">
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Lower Annotation Label matching image */}
              <div className="xray-annotation-badge" style={{
                borderColor: hasCxr ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.3)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: hasCxr ? '#f43f5e' : 'var(--cyan-400)'
              }}>
                {hasCxr ? `AI Segmentation: ${cxrDetection}` : 'Intake Screening: Baseline Thorax (Pending Study)'}
              </div>
            </>
          ) : (
            <div className="awaiting-scan-slate">
              <Crosshair size={42} color="var(--teal-accent)" style={{ opacity: 0.85, marginBottom: '8px' }} />
              <div className="awaiting-title">No Chest Imaging On File</div>
              <div className="awaiting-desc">
                Screening baseline — No thoracic radiograph or CT scan ingested yet. Upload an AP/PA Chest study to run MONAI nodule detection.
              </div>
              <button 
                type="button" 
                className="btn-primary-cyan mt-2" 
                onClick={onOpenScanUploader}
                style={{ fontSize: '0.75rem', padding: '5px 12px' }}
              >
                <UploadCloud size={13} style={{ marginRight: '5px' }} />
                Upload Chest X-Ray / CT
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '4px' }}>
          <span>{hasCxr ? 'Model: MONAI DenseNet121 + Grad-CAM' : 'Protocol: Screening Baseline'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: hasCxr ? 'var(--cyan-400)' : 'var(--text-muted)' }}>
            {hasCxr ? (currentCase?.cxr?.location || 'Apex Size: 14mm') : 'Study Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}
