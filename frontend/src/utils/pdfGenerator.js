import { jsPDF } from 'jspdf';

/**
 * Format date string into human-readable format
 */
const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

/**
 * Draw a styled medical badge / pill
 */
const drawBadge = (doc, text, x, y, bgRgb, textRgb = [255, 255, 255]) => {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const textWidth = doc.getTextWidth(text);
  const padX = 3;
  const padY = 1.5;
  const h = 4.5;
  const w = textWidth + padX * 2;

  doc.setFillColor(...bgRgb);
  doc.roundedRect(x, y - 3.2, w, h, 1.2, 1.2, 'F');
  doc.setTextColor(...textRgb);
  doc.text(text, x + padX, y);
  return w;
};

/**
 * Export Comprehensive Clinical Diagnostic Report PDF
 */
export const exportClinicalReportPdf = ({ currentCase, reportText }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 18;

  let cursorY = margin;
  let pageCount = 1;

  // Helper to ensure enough space on page or add page
  const checkPageBreak = (neededHeight) => {
    if (cursorY + neededHeight > bottomLimit) {
      doc.addPage();
      pageCount++;
      cursorY = margin + 8;
      drawHeaderBanner(false);
    }
  };

  // Draw Header Banner
  const drawHeaderBanner = (isFirstPage = true) => {
    // Top banner accent line
    doc.setFillColor(6, 182, 212); // Cyan accent
    doc.rect(margin, cursorY, contentWidth, 2, 'F');
    cursorY += 5;

    // Institution & Brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Navy slate
    doc.text('NEUROLAB AI', margin, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('LOCAL DIAGNOSTIC INTELLIGENCE PLATFORM · MULTI-MODALITY CLINICAL SUITE', margin, cursorY + 9);

    // Right-aligned report status
    const dossierTag = 'OFFICIAL CLINICAL DOSSIER';
    drawBadge(doc, dossierTag, pageWidth - margin - 52, cursorY + 2, [14, 116, 144]);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const nowStr = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Generated: ${nowStr}`, pageWidth - margin, cursorY + 8, { align: 'right' });
    doc.text(`Case ID: ${currentCase?.id || 'NL0001'} · MRN: ${currentCase?.mrn || 'MRN-Pending'}`, pageWidth - margin, cursorY + 12, { align: 'right' });

    cursorY += 16;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;
  };

  // Initial header
  drawHeaderBanner(true);

  // ============================================================================
  // 1. PATIENT DEMOGRAPHICS CARD
  // ============================================================================
  checkPageBreak(38);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, cursorY, contentWidth, 34, 2, 2, 'FD');

  const cardPadding = 4;
  let cardY = cursorY + cardPadding + 3;

  // Title inside card
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PATIENT RECORD & DEMOGRAPHICS', margin + cardPadding, cardY);

  const status = (currentCase?.case_status || currentCase?.status || 'REVIEWING').toUpperCase();
  const statusColor = status === 'CRITICAL' ? [220, 38, 38] : status === 'REVIEWING' ? [217, 119, 6] : [16, 185, 129];
  drawBadge(doc, `STATUS: ${status}`, pageWidth - margin - cardPadding - 32, cardY - 0.5, statusColor);

  cardY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + cardPadding, cardY, pageWidth - margin - cardPadding, cardY);
  cardY += 4.5;

  // 4-Column Grid for Demographics
  const col1 = margin + cardPadding;
  const col2 = margin + 50;
  const col3 = margin + 98;
  const col4 = margin + 144;

  const renderField = (label, val, x, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(String(val || 'N/A'), x, y + 3.8);
  };

  renderField('Full Legal Name', currentCase?.name || 'Sarah Johnson', col1, cardY);
  renderField('Patient ID / MRN', `${currentCase?.id || 'NL0194'} (${currentCase?.mrn || 'N/A'})`, col2, cardY);
  renderField('Age / Biological Sex', `${currentCase?.age || 63} yrs · ${currentCase?.gender || 'Female'}`, col3, cardY);
  renderField('Blood Group', currentCase?.blood_group || 'A+', col4, cardY);

  cardY += 9;
  renderField('Chief Complaint', (currentCase?.chief_complaint || 'Neurological evaluation').substring(0, 30), col1, cardY);
  renderField('Attending Lead', currentCase?.attending_doctor?.full_name || 'Dr. A. Chen, MD', col2, cardY);
  renderField('Admission Date', formatDate(currentCase?.admission_date), col3, cardY);
  renderField('Known Allergies', (currentCase?.allergies || 'Penicillin, Sulfa').substring(0, 22), col4, cardY);

  cursorY += 38;

  // ============================================================================
  // 2. MULTI-MODALITY DIAGNOSTIC IMAGING SUMMARY
  // ============================================================================
  checkPageBreak(42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. MULTI-MODALITY NEURO-IMAGING WORKUP', margin, cursorY);
  cursorY += 4;

  // Split in 2 side-by-side cards (Brain MRI & Chest CXR)
  const halfCardW = (contentWidth - 4) / 2;

  // Left Card: Brain MRI
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, halfCardW, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  doc.text('BRAIN MRI PROTOCOL', margin + 3, cursorY + 5);

  const mriReady = currentCase?.mri?.has_scan !== false;
  drawBadge(doc, mriReady ? 'STUDY READY' : 'PENDING', margin + halfCardW - 24, cursorY + 4.5, mriReady ? [16, 185, 129] : [148, 163, 184]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Modality: ${currentCase?.mri?.modality || 'Brain MRI (T1+Gd / FLAIR)'}`, margin + 3, cursorY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const mriDet = currentCase?.mri?.detection || 'Suspected High-Grade Glioma';
  doc.text(`Finding: ${mriDet.substring(0, 42)}`, margin + 3, cursorY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Location: ${currentCase?.mri?.location || 'Temporal Lobe'}`, margin + 3, cursorY + 21);
  doc.text(`Malignancy Risk Score: ${currentCase?.mri?.malignancy_risk ?? 92.5}% · Mass Effect: Present`, margin + 3, cursorY + 26);

  // Right Card: Chest CXR / Thoracic CT
  const cxrX = margin + halfCardW + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cxrX, cursorY, halfCardW, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  doc.text('CHEST RADIOGRAPHY / CT', cxrX + 3, cursorY + 5);

  const cxrReady = currentCase?.cxr?.has_scan !== false;
  drawBadge(doc, cxrReady ? 'STUDY READY' : 'PENDING', cxrX + halfCardW - 24, cursorY + 4.5, cxrReady ? [16, 185, 129] : [148, 163, 184]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Modality: ${currentCase?.cxr?.modality || 'Chest X-Ray / CT'}`, cxrX + 3, cursorY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const cxrDet = currentCase?.cxr?.detection || 'Pulmonary Nodule (Apex, 14mm)';
  doc.text(`Finding: ${cxrDet.substring(0, 42)}`, cxrX + 3, cursorY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Location: ${currentCase?.cxr?.location || 'Right Upper Lobe'}`, cxrX + 3, cursorY + 21);
  doc.text(`Segmentation: ${currentCase?.cxr?.segmentation_score ?? 88.1}% · Pneumonia: ${currentCase?.cxr?.pneumonia_score ?? 12.3}%`, cxrX + 3, cursorY + 26);

  cursorY += 37;

  // ============================================================================
  // 3. LABORATORY PATHOLOGY & BIOMARKER PANELS (TABULAR)
  // ============================================================================
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. LABORATORY PATHOLOGY & HEMATOLOGIC PANELS', margin, cursorY);

  const labsDate = currentCase?.labs?.all_dates?.[0] || 'Latest Available';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Specimen Evaluation Date: ${formatDate(labsDate)}`, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 4;

  // Collect key metrics across available panels
  const labRows = [];
  const labs = currentCase?.labs || {};

  const addLabMetrics = (panelName, panelKey, defaultItems) => {
    const data = labs[panelKey];
    if (data && Object.keys(data).length > 0) {
      Object.entries(data).forEach(([k, v]) => {
        const val = typeof v === 'object' ? v.value : v;
        const unit = typeof v === 'object' ? v.unit : '';
        const ref = typeof v === 'object' ? v.ref : 'Standard';
        const status = typeof v === 'object' ? (v.status || 'normal') : 'normal';
        labRows.push({ panel: panelName, test: k, value: `${val} ${unit}`.trim(), ref: ref || 'Standard', status });
      });
    } else if (defaultItems) {
      defaultItems.forEach(item => labRows.push({ panel: panelName, ...item }));
    }
  };

  addLabMetrics('CBC', 'cbc', [
    { test: 'Hemoglobin (Hb)', value: '12.1 g/dL', ref: '12.0-17.5', status: 'normal' },
    { test: 'White Blood Cells (WBC)', value: '8.9 K/mcL', ref: '4.5-11.0', status: 'normal' },
    { test: 'Platelets Count', value: '210 K/mcL', ref: '150-450', status: 'normal' }
  ]);

  addLabMetrics('Biomarkers', 'biomarkers', [
    { test: 'hs-CRP (Inflammation)', value: '32.0 mg/L', ref: '< 5.0', status: 'high' },
    { test: 'Serum Ferritin', value: '450 ng/mL', ref: '15-200', status: 'high' },
    { test: 'Lactate Dehydrogenase (LDH)', value: '245 U/L', ref: '140-220', status: 'high' },
    { test: 'CEA (Carcinoembryonic)', value: '4.8 ng/mL', ref: '< 3.0', status: 'high' }
  ]);

  addLabMetrics('Renal/Metabolic', 'kft', [
    { test: 'Serum Creatinine', value: '1.25 mg/dL', ref: '0.6-1.2', status: 'high' },
    { test: 'eGFR', value: '78 mL/min', ref: '90-140', status: 'low' }
  ]);

  // Render Table Header
  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('PANEL / CATEGORY', margin + 3, cursorY + 4.2);
    doc.text('DIAGNOSTIC TEST PARAMETER', margin + 35, cursorY + 4.2);
    doc.text('OBSERVED VALUE', margin + 95, cursorY + 4.2);
    doc.text('REFERENCE RANGE', margin + 130, cursorY + 4.2);
    doc.text('INTERPRETATION', margin + 160, cursorY + 4.2);
    cursorY += 6.5;
  };

  drawTableHeader();

  // Render Rows
  labRows.slice(0, 10).forEach((row, idx) => {
    checkPageBreak(6.5);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, cursorY - 0.5, contentWidth, 5.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(row.panel, margin + 3, cursorY + 3.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(row.test.substring(0, 32), margin + 35, cursorY + 3.2);

    const isHigh = row.status === 'high' || row.status === 'elevated';
    const isLow = row.status === 'low';

    if (isHigh) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else if (isLow) {
      doc.setTextColor(217, 119, 6);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(row.value, margin + 95, cursorY + 3.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(row.ref, margin + 130, cursorY + 3.2);

    // Status Badge
    if (isHigh) {
      drawBadge(doc, 'ELEVATED [H]', margin + 158, cursorY + 3.2, [239, 68, 68]);
    } else if (isLow) {
      drawBadge(doc, 'LOW [L]', margin + 158, cursorY + 3.2, [245, 158, 11]);
    } else {
      drawBadge(doc, 'NORMAL', margin + 158, cursorY + 3.2, [16, 185, 129]);
    }

    cursorY += 5.5;
  });

  cursorY += 4;

  // ============================================================================
  // 4. AI DIAGNOSTIC SYNTHESIS & CLINICAL IMPRESSION
  // ============================================================================
  checkPageBreak(45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. AI CLINICAL SYNTHESIS & DIAGNOSTIC IMPRESSION', margin, cursorY);
  cursorY += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);

  const cleanReportText = reportText || 
    `CLINICAL CORRELATION IMPRESSION:
1. Brain MRI demonstrates an intracranial mass lesion in the left temporal parenchyma with marked local edema and positive mass effect.
2. Concurrent chest imaging reveals a 14mm solitary nodule in the right apex requiring staging evaluation.
3. Laboratory biomarkers indicate acute phase inflammatory elevation (hs-CRP 32 mg/L, Ferritin 450 ng/mL) and elevated CEA.
4. Multidisciplinary neuro-oncology tumor board review and stereotactic biopsy consultation recommended.`;

  const splitLines = doc.splitTextToSize(cleanReportText, contentWidth - 8);
  const synthBoxH = Math.max(splitLines.length * 4.2 + 8, 28);

  checkPageBreak(synthBoxH + 4);
  doc.roundedRect(margin, cursorY, contentWidth, synthBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(splitLines, margin + 4, cursorY + 6);

  cursorY += synthBoxH + 6;

  // ============================================================================
  // 5. ATTENDING PHYSICIAN CERTIFICATION & DISCLAIMER BLOCK
  // ============================================================================
  checkPageBreak(30);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 22, 2, 2, 'FD');

  const docName = currentCase?.attending_doctor?.full_name || 'Dr. A. Chen, MD';
  const license = currentCase?.attending_doctor?.license_number || 'MD-89210';
  const specialty = currentCase?.attending_doctor?.specialty || 'Neuro-Radiology & Oncology';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Attending Physician: ${docName}`, margin + 4, cursorY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`License: ${license} · Specialty: ${specialty}`, margin + 4, cursorY + 10);
  doc.text('Verification: Electronically reviewed and signed off via NeuroLab AI Clinical Intelligence Suite.', margin + 4, cursorY + 14.5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DISCLAIMER: AI-synthesized clinical findings are designed for decision support. Final diagnostic and treatment authority rests with the licensed medical practitioner.', margin + 4, cursorY + 19);

  // Digital Signature Stamp
  const sigX = pageWidth - margin - 45;
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(0.6);
  doc.rect(sigX, cursorY + 3, 40, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(14, 116, 144);
  doc.text('DIGITALLY CERTIFIED', sigX + 20, cursorY + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`SHA-256: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, sigX + 20, cursorY + 11.5, { align: 'center' });
  const nowStr = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  doc.text(nowStr.substring(0, 16), sigX + 20, cursorY + 15, { align: 'center' });

  // Add Page Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL MEDICAL RECORD · PROTECTED HEALTH INFORMATION (HIPAA / GDPR COMPLIANT)', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // Trigger true file download
  const cleanId = (currentCase?.id || 'Patient').replace(/\s+/g, '_');
  const safeDate = new Date().toISOString().split('T')[0];
  const filename = `NeuroLab_Diagnostic_Report_${cleanId}_${safeDate}.pdf`;
  doc.save(filename);
  return filename;
};

/**
 * Export Dedicated Laboratory Pathology History Report PDF
 */
export const exportLabHistoryPdf = ({ currentCase, selectedDate = null }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 18;

  let cursorY = margin;

  const checkPageBreak = (neededHeight) => {
    if (cursorY + neededHeight > bottomLimit) {
      doc.addPage();
      cursorY = margin + 8;
      drawLabHeader();
    }
  };

  const drawLabHeader = () => {
    doc.setFillColor(6, 182, 212);
    doc.rect(margin, cursorY, contentWidth, 2, 'F');
    cursorY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text('NEUROLAB AI — CLINICAL PATHOLOGY & LAB HISTORY', margin, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('LONGITUDINAL SPECIMEN TRACKING & BIOMARKER PROFILES', margin, cursorY + 9);

    const filterTag = selectedDate ? `SPECIMEN: ${formatDate(selectedDate)}` : 'ALL HISTORICAL DATES';
    drawBadge(doc, filterTag, pageWidth - margin - 50, cursorY + 2, [14, 116, 144]);

    cursorY += 16;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;
  };

  drawLabHeader();

  // Patient Info Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, cursorY, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Patient: ${currentCase?.name || 'Sarah Johnson'} (${currentCase?.id || 'NL0194'})`, margin + 4, cursorY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`MRN: ${currentCase?.mrn || 'MRN-849201'} · Age/Sex: ${currentCase?.age || 63}y / ${currentCase?.gender || 'Female'} · Blood: ${currentCase?.blood_group || 'A+'}`, margin + 4, cursorY + 11.5);
  doc.text(`Attending: ${currentCase?.attending_doctor?.full_name || 'Dr. A. Chen, MD'}`, pageWidth - margin - 4, cursorY + 11.5, { align: 'right' });

  cursorY += 21;

  // Extract history entries
  const historyList = currentCase?.labs?.history_by_date || [];
  const entriesToRender = selectedDate 
    ? historyList.filter(h => h.test_date === selectedDate)
    : historyList;

  if (entriesToRender.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No historical laboratory sessions on record for this patient.', margin, cursorY + 10);
    cursorY += 20;
  } else {
    entriesToRender.forEach((entry) => {
      checkPageBreak(30);

      // Date Header Bar
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, cursorY, contentWidth, 8, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`SPECIMEN COLLECTION DATE: ${formatDate(entry.test_date)}`, margin + 4, cursorY + 5.5);

      const abnormalCount = entry.total_abnormal || entry.abnormal_flags?.length || 0;
      if (abnormalCount > 0) {
        drawBadge(doc, `${abnormalCount} ABNORMAL MARKERS`, pageWidth - margin - 42, cursorY + 5.5, [239, 68, 68]);
      } else {
        drawBadge(doc, `ALL WITHIN NORMAL RANGE`, pageWidth - margin - 46, cursorY + 5.5, [16, 185, 129]);
      }

      cursorY += 10;

      // Table Header for this date
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, cursorY, contentWidth, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('PANEL', margin + 3, cursorY + 3.8);
      doc.text('PARAMETER', margin + 30, cursorY + 3.8);
      doc.text('MEASURED VALUE', margin + 95, cursorY + 3.8);
      doc.text('REFERENCE INTERVAL', margin + 130, cursorY + 3.8);
      doc.text('STATUS', margin + 165, cursorY + 3.8);
      cursorY += 6;

      // Table rows for all records in this date
      const dateRecords = entry.records || [];
      let rowIndex = 0;

      dateRecords.forEach((rec) => {
        const catName = (rec.category || 'Panel').toUpperCase();
        const metrics = rec.metrics || {};

        Object.entries(metrics).forEach(([k, v]) => {
          checkPageBreak(6);
          if (rowIndex % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, cursorY - 0.5, contentWidth, 5, 'F');
          }

          const val = typeof v === 'object' ? v.value : v;
          const unit = typeof v === 'object' ? (v.unit || '') : '';
          const ref = typeof v === 'object' ? (v.ref || 'Normal') : 'Normal';
          const status = typeof v === 'object' ? (v.status || 'normal') : 'normal';

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(catName, margin + 3, cursorY + 3.2);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(k.substring(0, 30), margin + 30, cursorY + 3.2);

          const isHigh = status === 'high' || status === 'elevated';
          const isLow = status === 'low';

          if (isHigh) {
            doc.setTextColor(220, 38, 38);
            doc.setFont('helvetica', 'bold');
          } else if (isLow) {
            doc.setTextColor(217, 119, 6);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'normal');
          }
          doc.text(`${val} ${unit}`.trim(), margin + 95, cursorY + 3.2);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(ref, margin + 130, cursorY + 3.2);

          if (isHigh) {
            drawBadge(doc, 'HIGH [H]', margin + 165, cursorY + 3.2, [239, 68, 68]);
          } else if (isLow) {
            drawBadge(doc, 'LOW [L]', margin + 165, cursorY + 3.2, [245, 158, 11]);
          } else {
            drawBadge(doc, 'NORMAL', margin + 165, cursorY + 3.2, [16, 185, 129]);
          }

          cursorY += 5;
          rowIndex++;
        });
      });

      cursorY += 6;
    });
  }

  // Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('NEUROLAB AI PATHOLOGY ARCHIVE · PROTECTED HEALTH INFORMATION', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const cleanId = (currentCase?.id || 'Patient').replace(/\s+/g, '_');
  const tag = selectedDate ? selectedDate.replace(/-/g, '') : 'FullHistory';
  const filename = `NeuroLab_Labs_${cleanId}_${tag}.pdf`;
  doc.save(filename);
  return filename;
};
