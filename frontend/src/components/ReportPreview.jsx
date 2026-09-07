import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Loader2,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportClinicalReportPdf } from '../utils/pdfGenerator';

export default function ReportPreview({ 
  currentCase, 
  reportData, 
  isGenerating, 
  onGenerateReport 
}) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const name = currentCase?.name || 'SARAH JOHNSON';

  const handleCopy = () => {
    const textToCopy = reportData?.report || defaultReportContent;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      exportClinicalReportPdf({
        currentCase,
        reportText: reportData?.report || defaultReportContent
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const isSarah = currentCase?.id === 'NL0194';
  const hasMri = currentCase?.mri?.has_scan ?? isSarah;
  const hasCxr = currentCase?.cxr?.has_scan ?? isSarah;

  const mriDraftText = hasMri 
    ? (currentCase?.mri?.detection || "Suspected High-Grade Glioma (Left Temporal Lobe)")
    : `Awaiting Brain MRI Study. Intake evaluation: ${currentCase?.chief_complaint || 'Diagnostic Workup'}.`;

  const cxrDraftText = hasCxr
    ? (currentCase?.cxr?.detection || "Suspicious Pulmonary Nodule (Right Apex)")
    : `Awaiting Chest Study. No thoracic infiltrates recorded.`;

  const summaryDraftText = isSarah
    ? "Probable malignant neoplastic process (CNS), concurrent pulmonary findings requiring investigation. Recommended next steps include stereotactic biopsy, chest contrast CT, and multidisciplinary tumor board review."
    : (hasMri || hasCxr)
      ? `Diagnostic study ingested. Clinical correlation recommended with attending physician.`
      : `Patient intake complete for ${currentCase?.chief_complaint || 'general diagnostic evaluation'}. Baseline physiological vitals within normal parameters. Click "Generate AI Insights" to synthesize a complete clinical report using Qwen 2.5 72B Medical LLM.`;

  // Dynamic initial content
  const defaultReportContent = `NEUROLAB AI DIAGNOSTIC REPORT (Draft) - ${name.toUpperCase()} (ID: ${currentCase?.id || 'NL0001'}, ${currentCase?.gender || 'Unknown'}, ${currentCase?.age || 30}y)

MRI: ${mriDraftText}

Chest X-ray: ${cxrDraftText}

Summary: ${summaryDraftText}`;

  return (
    <div className="neurolab-panel report-preview-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <FileText size={16} color="var(--cyan-neon)" />
          <span style={{ fontSize: '0.85rem' }}>Patient Report Preview</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="tool-icon-btn" 
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy Report Text"}
          >
            {copied ? <Check size={14} color="var(--green-normal)" /> : <Copy size={14} />}
          </button>
          <button 
            className="tool-icon-btn" 
            onClick={handleExportPdf}
            title="Export Clinical Diagnostic Report (.pdf)"
          >
            <Download size={14} color="var(--cyan-neon)" />
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Report Content Box matching the image draft preview */}
        <div className="report-content-scroll">
          {isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--cyan-neon)' }}>
              <Loader2 size={32} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Synthesizing imaging & biomarkers with Clinical LLM...
              </span>
            </div>
          ) : reportData?.report ? (
            <div style={{ whiteSpace: 'pre-line', fontSize: '0.825rem' }}>
              {reportData.report}
            </div>
          ) : (
            <>
              <div className="report-title-header">
                NEUROLAB AI DIAGNOSTIC REPORT (Draft) - {name.toUpperCase()}
              </div>

              <div className="report-section">
                <div className="report-section-label">MRI:</div>
                <div className="report-section-body">
                  {mriDraftText}
                </div>
              </div>

              <div className="report-section">
                <div className="report-section-label">Chest X-ray:</div>
                <div className="report-section-body">
                  {cxrDraftText}
                </div>
              </div>

              <div className="report-section">
                <div className="report-section-label">Summary:</div>
                <div className="report-section-body">
                  {summaryDraftText}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="report-actions-footer">
          <button 
            className="btn-primary" 
            onClick={onGenerateReport}
            disabled={isGenerating}
            style={{ flex: 1 }}
          >
            <Sparkles size={14} />
            <span>{isGenerating ? "Analyzing..." : "Generate AI Insights"}</span>
          </button>

          <button 
            className="btn-secondary" 
            onClick={handleExportPdf}
            disabled={isExporting}
            title="Download full publication-grade Clinical Diagnostic Report PDF"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Generating PDF...</span>
              </>
            ) : exportSuccess ? (
              <>
                <Check size={14} color="var(--green-normal)" />
                <span style={{ color: 'var(--green-normal)' }}>Downloaded!</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
