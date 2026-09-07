import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sun, 
  ShieldAlert, 
  Activity, 
  Brain, 
  UploadCloud, 
  Contrast, 
  Maximize2 
} from 'lucide-react';
import { getAxialBrainMri, getSagittalBrainMri1, getSagittalBrainMri2 } from '../utils/medicalImages';

export default function MriAnalysisPanel({ currentCase, onOpenScanUploader }) {
  const isSarah = currentCase?.id === 'NL0194';
  const hasScan = currentCase?.mri?.has_scan ?? isSarah;
  const isHighRisk = (currentCase?.mri?.malignancy_risk ?? 0) > 50;

  const seriesImages = currentCase?.mri?.series_images || [];
  const hasSeries = seriesImages.length > 0;
  const totalSlices = hasSeries ? seriesImages.length : (isSarah ? 24 : 1);
  const isDicomVolume = hasSeries && seriesImages.length > 1;

  const [sliceIndex, setSliceIndex] = useState(hasSeries ? Math.ceil(totalSlices / 2) : (isSarah ? 14 : 1));
  const [showMask, setShowMask] = useState(isSarah);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [isInverted, setIsInverted] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Sync slice & mask state on case changes
  useEffect(() => {
    setShowMask(hasScan && isHighRisk);
    if (hasSeries) {
      setSliceIndex(Math.ceil(totalSlices / 2));
    } else if (isSarah) {
      setSliceIndex(14);
    } else {
      setSliceIndex(1);
    }
    setZoom(1);
  }, [currentCase?.id, totalSlices, hasSeries, hasScan, isHighRisk, isSarah]);

  const name = currentCase?.name || 'Sarah Johnson';
  const id = currentCase?.id || 'NL0194';
  const gender = currentCase?.gender?.[0] || 'F';
  const age = currentCase?.age || 63;
  const detectionText = currentCase?.mri?.detection || (isSarah ? 'Detection - Glioblastoma Multiforme' : `Awaiting Brain Study — Intake: ${currentCase?.chief_complaint || 'Workup'}`);

  // Resolve current active slice image URL
  let activeSliceUrl = null;
  if (hasSeries) {
    const safeIdx = Math.max(0, Math.min(sliceIndex - 1, totalSlices - 1));
    activeSliceUrl = seriesImages[safeIdx];
  } else if (isSarah) {
    activeSliceUrl = getAxialBrainMri(sliceIndex, showMask);
  } else {
    activeSliceUrl = currentCase?.mri?.image_url || getAxialBrainMri(sliceIndex, showMask);
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2.2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.8));
  const handleReset = () => {
    setZoom(1);
    setContrast(100);
    setBrightness(100);
    setIsInverted(false);
  };

  return (
    <div className="neurolab-panel mri-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title">
          <span>{name}</span>
          <span className="panel-title-tag">(ID: {id}, {gender}, {age})</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {isDicomVolume && (
            <span className="dicom-status-badge">
              DICOM 3D ({totalSlices} Slices)
            </span>
          )}
          {hasScan && (
            <>
              <button 
                className={`tool-icon-btn ${isInverted ? 'active' : ''}`}
                onClick={() => setIsInverted(!isInverted)}
                title={isInverted ? "Standard PACS Mode" : "Invert Pixel Values (Negative)"}
              >
                <Contrast size={14} color={isInverted ? "var(--cyan-neon)" : "inherit"} />
              </button>
              {isSarah && (
                <button 
                  className="tool-icon-btn" 
                  onClick={() => setShowMask(!showMask)}
                  title={showMask ? "Hide Tumor Segmentation" : "Show Tumor Segmentation"}
                >
                  {showMask ? <Eye size={15} color="var(--cyan-neon)" /> : <EyeOff size={15} />}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="panel-body">
        {/* Detection Tag matching image */}
        <div className="detection-tag">
          {hasScan ? (
            isHighRisk ? <ShieldAlert size={14} color="#f43f5e" /> : <Activity size={14} color="var(--cyan-neon)" />
          ) : (
            <Activity size={14} color="var(--cyan-400)" />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hasScan ? `AI Analysis: ${detectionText}` : `AI Status: ${detectionText}`}
          </span>
        </div>

        {/* Multi-slice Viewport Container */}
        {(() => {
          const isMultiView = isSarah || Boolean(currentCase?.mri?.sagittal_url_1);
          return (
            <div className={`mri-viewport-container ${isMultiView ? 'multi-view' : 'single-view'}`}>
              {hasScan ? (
                <>
                  <div 
                    className="mri-axial-main"
                    style={{ 
                      filter: `contrast(${contrast}%) brightness(${brightness}%) ${isInverted ? 'invert(1)' : ''}`,
                      position: 'relative'
                    }}
                  >
                    {/* Viewport Slice Info Overlay */}
                    <div className="mri-viewport-hud">
                      <span className="hud-slice-text">
                        {isDicomVolume ? `SL: ${sliceIndex}/${totalSlices}` : (isSarah ? `SE: ${sliceIndex}/24` : `AXIAL`)}
                      </span>
                      {isInverted && <span className="hud-invert-tag">INV</span>}
                    </div>

                    <div 
                      style={{ 
                        transform: `scale(${zoom})`, 
                        transition: 'transform 0.15s ease-out',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img 
                        src={activeSliceUrl} 
                        alt="Brain MRI Axial View" 
                        className="mri-axial-img"
                        onError={(e) => {
                          if (isSarah) {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAxialBrainMri(sliceIndex, showMask);
                          }
                        }}
                      />
                    </div>

                    {/* Floating Zoom Controls */}
                    <div className="viewport-floating-tools" style={{ top: '8px', right: '8px' }}>
                      <button className="tool-icon-btn" onClick={handleZoomIn} title="Zoom In">
                        <ZoomIn size={13} />
                      </button>
                      <button className="tool-icon-btn" onClick={handleZoomOut} title="Zoom Out">
                        <ZoomOut size={13} />
                      </button>
                      <button className="tool-icon-btn" onClick={handleReset} title="Reset PACS View">
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Dual Sagittal Slices (shown for multi-slice studies with sag reconstructions) */}
                  {isMultiView && (
                    <div className="mri-sagittal-column">
                      <div className="mri-sagittal-slice">
                        <span className="slice-badge">SAG-1</span>
                        <img 
                          src={currentCase?.mri?.sagittal_url_1 || getSagittalBrainMri1()} 
                          alt="Brain MRI Sagittal Slice 1" 
                          className="mri-sagittal-img"
                        />
                      </div>
                      <div className="mri-sagittal-slice">
                        <span className="slice-badge">SAG-2</span>
                        <img 
                          src={currentCase?.mri?.sagittal_url_2 || getSagittalBrainMri2()} 
                          alt="Brain MRI Sagittal Slice 2" 
                          className="mri-sagittal-img"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="awaiting-scan-slate">
                  <Brain size={42} color="var(--cyan-neon)" style={{ opacity: 0.85, marginBottom: '8px' }} />
                  <div className="awaiting-title">No Brain MRI Study On File</div>
                  <div className="awaiting-desc">
                    Patient intake registered for: <em>{currentCase?.chief_complaint || 'Diagnostic Workup'}</em>. Upload an MRI slice or DICOM scan to trigger neural segmentation.
                  </div>
                  <button 
                    type="button" 
                    className="btn-primary-cyan mt-2" 
                    onClick={onOpenScanUploader}
                    style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                  >
                    <UploadCloud size={13} style={{ marginRight: '5px' }} />
                    Upload Brain MRI Scan
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Controls Footer */}
        {hasScan ? (
          <div className="mri-controls-footer">
            <div className="mri-slider-container">
              <Layers size={14} color="var(--cyan-400)" />
              <span style={{ fontSize: '0.725rem' }}>Slice:</span>
              <input 
                type="range" 
                min="1" 
                max={totalSlices} 
                value={sliceIndex} 
                onChange={(e) => setSliceIndex(Number(e.target.value))}
                className="mri-slider"
                disabled={totalSlices <= 1}
              />
              <span style={{ fontFamily: 'var(--font-mono)', minWidth: '42px', color: 'var(--cyan-neon)' }}>
                {sliceIndex}/{totalSlices}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Contrast</span>
                <input 
                  type="range" 
                  min="70" 
                  max="180" 
                  value={contrast} 
                  onChange={(e) => setContrast(Number(e.target.value))}
                  style={{ width: '55px', accentColor: 'var(--cyan-neon)' }}
                  title={`Contrast: ${contrast}%`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mri-controls-footer" style={{ justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>Diagnostic Imaging Status: Ingestion Pending</span>
          </div>
        )}
      </div>
    </div>
  );
}
