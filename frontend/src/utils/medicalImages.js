/**
 * Generates realistic high-contrast SVG medical imaging data URLs
 * matching the exact multi-slice MRI and Chest X-ray seen in neuroLabAI.png
 */

// 1. Main Axial Brain MRI with hyperintense ring-enhancing lesion in left temporal lobe
export function getAxialBrainMri(slice = 14, showMask = true) {
  const lesionOpacity = showMask ? 0.9 : 0.0;
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="400" height="400" fill="%2304080e"/>
    
    <!-- Skull & Scalp contour -->
    <ellipse cx="200" cy="200" rx="150" ry="175" fill="%23111827" stroke="%23374151" stroke-width="4"/>
    <ellipse cx="200" cy="200" rx="142" ry="168" fill="%23000000"/>
    
    <!-- Cortical brain parenchyma (Gray & White matter) -->
    <path d="M 90,200 C 90,95 310,95 310,200 C 310,315 90,315 90,200 Z" fill="%231e293b" opacity="0.95"/>
    <path d="M 110,200 C 110,120 290,120 290,200 C 290,295 110,295 110,200 Z" fill="%23334155" opacity="0.6"/>
    
    <!-- Hemispheric interhemispheric fissure & ventricles -->
    <line x1="200" y1="50" x2="200" y2="350" stroke="%23090d16" stroke-width="3" stroke-dasharray="8,4"/>
    <!-- Lateral Ventricles (Frontal Horns) -->
    <path d="M 185,160 Q 170,190 188,210 Q 192,185 185,160 Z" fill="%2304080e"/>
    <path d="M 215,160 Q 230,190 212,210 Q 208,185 215,160 Z" fill="%2304080e"/>

    <!-- Left Temporal / Frontotemporal Mass (Ring Enhancing Lesion) -->
    <g opacity="${lesionOpacity}">
      <!-- Vasogenic perilesional edema glow -->
      <ellipse cx="270" cy="230" rx="42" ry="36" fill="%23475569" opacity="0.5" filter="blur(6px)"/>
      <!-- Hyperintense Enhancing Outer Rim -->
      <ellipse cx="272" cy="232" rx="26" ry="24" fill="%23e2e8f0" stroke="%23ffffff" stroke-width="3" filter="drop-shadow(0 0 6px rgba(255,255,255,0.8))"/>
      <!-- Hypointense Central Necrotic Core -->
      <ellipse cx="272" cy="232" rx="16" ry="14" fill="%23090d16"/>
      <!-- Target measurement crosshair -->
      <line x1="262" y1="232" x2="282" y2="232" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="2,2"/>
      <line x1="272" y1="222" x2="272" y2="242" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="2,2"/>
    </g>

    <!-- Slice Metadata overlay -->
    <text x="16" y="26" fill="%2338bdf8" font-family="monospace" font-size="12" font-weight="bold">SE: ${slice} / 24</text>
    <text x="16" y="42" fill="%2364748b" font-family="monospace" font-size="10">T1+Gd AXIAL</text>
    <text x="320" y="26" fill="%23f59e0b" font-family="monospace" font-size="11">R: 3.2cm</text>
  </svg>`;
}

// 2. Sagittal Brain MRI Slice 1
export function getSagittalBrainMri1() {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="100%" height="100%">
    <rect width="240" height="180" fill="%2304080e"/>
    <!-- Skull profile sagittal -->
    <path d="M 40,160 C 20,60 90,20 180,40 C 210,60 210,130 180,160 Z" fill="%231e293b" stroke="%23475569" stroke-width="2"/>
    <!-- Brain stem & cerebellum -->
    <ellipse cx="140" cy="130" rx="25" ry="18" fill="%23334155"/>
    <path d="M 125,130 Q 120,170 125,175" stroke="%2304080e" stroke-width="12"/>
    <!-- Corpus callosum -->
    <path d="M 80,85 Q 120,60 160,85" stroke="%23e2e8f0" stroke-width="4" fill="none" opacity="0.8"/>
    <!-- Supratentorial mass highlight -->
    <ellipse cx="150" cy="95" rx="14" ry="12" fill="%23ffffff" stroke="%2338bdf8" stroke-width="2" opacity="0.9"/>
    <text x="10" y="20" fill="%2338bdf8" font-family="monospace" font-size="10">SAG: 08/20</text>
  </svg>`;
}

// 3. Sagittal Brain MRI Slice 2
export function getSagittalBrainMri2() {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="100%" height="100%">
    <rect width="240" height="180" fill="%2304080e"/>
    <!-- Skull profile sagittal cut 2 -->
    <path d="M 45,160 C 25,65 95,25 185,45 C 215,65 215,135 185,160 Z" fill="%231e293b" stroke="%23475569" stroke-width="2"/>
    <ellipse cx="145" cy="132" rx="22" ry="16" fill="%23334155"/>
    <!-- Brain folds & gyri -->
    <path d="M 85,90 Q 125,65 165,90" stroke="%2394a3b8" stroke-width="3" fill="none" opacity="0.5"/>
    <!-- Mass outline -->
    <ellipse cx="155" cy="100" rx="16" ry="14" fill="%23e2e8f0" stroke="%23f59e0b" stroke-width="2" opacity="0.85"/>
    <text x="10" y="20" fill="%2338bdf8" font-family="monospace" font-size="10">SAG: 12/20</text>
  </svg>`;
}

// 4. Chest X-Ray with Rainbow/Jet Grad-CAM Heatmap over Right Lung Apex
export function getChestXrayGradCam(heatmapOpacity = 0.85, showBbox = true) {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 400" width="100%" height="100%">
    <defs>
      <!-- Grad-CAM Radial Rainbow Heatmap Gradient -->
      <radialGradient id="gradcamHeat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23ef4444" stop-opacity="0.95"/>
        <stop offset="35%" stop-color="%23f59e0b" stop-opacity="0.85"/>
        <stop offset="65%" stop-color="%2310b981" stop-opacity="0.6"/>
        <stop offset="85%" stop-color="%2300e5ff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="%230284c7" stop-opacity="0"/>
      </radialGradient>
    </defs>
    
    <rect width="420" height="400" fill="%2302060c"/>

    <!-- Spine & Mediastinum -->
    <rect x="195" y="30" width="30" height="340" fill="%2394a3b8" opacity="0.5" rx="6"/>
    <!-- Clavicles -->
    <path d="M 50,75 Q 160,85 200,80 Q 240,85 350,75" stroke="%23cbd5e1" stroke-width="10" fill="none" opacity="0.75"/>
    
    <!-- Left Lung Field (anatomical right, viewer's left: Right Lung) -->
    <path d="M 90,85 C 170,90 190,140 190,320 C 120,340 70,300 70,160 Z" fill="%231e293b" stroke="%23475569" stroke-width="3" opacity="0.9"/>
    
    <!-- Right Lung Field (anatomical left, viewer's right: Left Lung) -->
    <path d="M 330,85 C 250,90 230,140 230,320 C 300,340 350,300 350,160 Z" fill="%231e293b" stroke="%23475569" stroke-width="3" opacity="0.9"/>
    
    <!-- Rib contours -->
    <g stroke="%2364748b" stroke-width="4" opacity="0.4" fill="none">
      <path d="M 90,120 Q 150,140 190,130"/>
      <path d="M 85,160 Q 150,185 190,170"/>
      <path d="M 80,205 Q 150,230 190,210"/>
      <path d="M 75,250 Q 150,270 190,250"/>
      
      <path d="M 330,120 Q 270,140 230,130"/>
      <path d="M 335,160 Q 270,185 230,170"/>
      <path d="M 340,205 Q 270,230 230,210"/>
      <path d="M 345,250 Q 270,270 230,250"/>
    </g>

    <!-- Cardiac Silhouette -->
    <path d="M 190,210 C 190,290 260,310 260,250 C 260,220 200,200 190,210 Z" fill="%23cbd5e1" opacity="0.55"/>

    <!-- AI Grad-CAM Heatmap overlay on Right Lung Apex (Viewer's upper-left) -->
    <g opacity="${heatmapOpacity}">
      <ellipse cx="140" cy="125" rx="46" ry="42" fill="url(%23gradcamHeat)"/>
      <circle cx="142" cy="125" r="8" fill="%23ffffff" opacity="0.85"/>
    </g>

    <!-- Bounding Box Annotation matching neuroLabAI.png -->
    ${showBbox ? `
      <rect x="98" y="88" width="86" height="80" fill="none" stroke="%2300e5ff" stroke-width="2" stroke-dasharray="4,2"/>
      <rect x="98" y="72" width="86" height="16" fill="%2300e5ff"/>
      <text x="104" y="83" fill="%23000000" font-family="sans-serif" font-size="9" font-weight="bold">Apex Nodule: 14mm</text>
    ` : ''}

    <!-- Metadata overlay -->
    <text x="18" y="26" fill="%2338bdf8" font-family="monospace" font-size="11" font-weight="bold">CXR AP ERECT</text>
    <text x="330" y="26" fill="%23ffffff" font-family="monospace" font-size="11">08/10/24</text>
  </svg>`;
}
