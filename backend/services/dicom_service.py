import os
import pydicom
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional, Tuple

def is_dicom_file(filepath: str) -> bool:
    """Check if file is a DICOM file by extension or DICM magic header bytes."""
    lower_path = filepath.lower()
    if lower_path.endswith(('.dcm', '.dicom')):
        return True
    try:
        with open(filepath, 'rb') as f:
            f.seek(128)
            magic = f.read(4)
            return magic == b'DICM'
    except Exception:
        return False

def map_dicom_modality(raw_modality: str) -> str:
    """Map DICOM modality tag (MR, CT, CR, DX, etc.) to app modality enum."""
    raw = (raw_modality or '').strip().upper()
    if raw in ['MR', 'MRI', 'NMR']:
        return 'mri'
    elif raw in ['CR', 'DX', 'RG', 'XR', 'XRAY']:
        return 'cxr'
    elif raw in ['CT', 'CAT']:
        return 'ct'
    elif raw in ['US', 'ULTRASOUND']:
        return 'ct' # mapped to general abdomen/cross-sectional
    return 'mri' # default fallback

def process_dicom_file(dicom_path: str, uploads_root: str = "static/uploads") -> Dict[str, Any]:
    """
    Parses a DICOM file, extracts all 2D slices or 3D volumetric frames,
    applies medical windowing/normalization, and saves high-resolution PNG slices.
    """
    os.makedirs(uploads_root, exist_ok=True)
    basename = os.path.splitext(os.path.basename(dicom_path))[0]
    output_dir = os.path.join(uploads_root, f"slices_{basename}")
    os.makedirs(output_dir, exist_ok=True)

    try:
        ds = pydicom.dcmread(dicom_path, force=True)
    except Exception as e:
        raise ValueError(f"Failed to read DICOM dataset: {e}")

    # Extract metadata tags
    patient_name = str(getattr(ds, 'PatientName', 'Unknown')).replace('^', ' ')
    patient_id = str(getattr(ds, 'PatientID', 'Unknown'))
    modality_raw = str(getattr(ds, 'Modality', 'MR')).strip().upper()
    app_modality = map_dicom_modality(modality_raw)
    series_desc = str(getattr(ds, 'SeriesDescription', '')).strip()
    study_desc = str(getattr(ds, 'StudyDescription', '')).strip()
    photometric = str(getattr(ds, 'PhotometricInterpretation', 'MONOCHROME2')).strip()

    slope = float(getattr(ds, 'RescaleSlope', 1.0))
    intercept = float(getattr(ds, 'RescaleIntercept', 0.0))

    # Read window center/width if present
    wc = getattr(ds, 'WindowCenter', None)
    ww = getattr(ds, 'WindowWidth', None)
    if isinstance(wc, (list, pydicom.multival.MultiValue)):
        wc = float(wc[0])
    elif wc is not None:
        try:
            wc = float(wc)
        except (ValueError, TypeError):
            wc = None

    if isinstance(ww, (list, pydicom.multival.MultiValue)):
        ww = float(ww[0])
    elif ww is not None:
        try:
            ww = float(ww)
        except (ValueError, TypeError):
            ww = None

    # Extract pixel array
    try:
        pixel_array = ds.pixel_array
    except Exception as e:
        raise ValueError(f"Failed to extract pixel array from DICOM: {e}")

    # Determine slice dimensions
    # Shapes can be (num_slices, rows, cols), (rows, cols), or with RGB channels
    slices_list = []
    if pixel_array.ndim == 2:
        slices_list = [pixel_array]
    elif pixel_array.ndim == 3:
        if pixel_array.shape[2] == 3:
            # Single RGB slice
            slices_list = [pixel_array]
        else:
            # Multi-frame (num_slices, rows, cols)
            slices_list = [pixel_array[i] for i in range(pixel_array.shape[0])]
    elif pixel_array.ndim == 4:
        # Multi-frame color (num_slices, rows, cols, 3)
        slices_list = [pixel_array[i] for i in range(pixel_array.shape[0])]
    else:
        raise ValueError(f"Unsupported DICOM array dimensions: {pixel_array.shape}")

    total_slices = len(slices_list)
    series_urls: List[str] = []

    for idx, slice_raw in enumerate(slices_list):
        # Apply rescale slope/intercept if single-channel
        if slice_raw.ndim == 2:
            slice_data = slice_raw.astype(np.float32) * slope + intercept
            
            # Apply Windowing
            if wc is not None and ww is not None and ww > 0:
                min_v = wc - (ww / 2.0)
                max_v = wc + (ww / 2.0)
                norm = np.clip((slice_data - min_v) / (max_v - min_v) * 255.0, 0, 255).astype(np.uint8)
            else:
                # Robust percentile scaling (1% - 99.5%) prevents hot pixel saturation
                p1 = np.percentile(slice_data, 1.0)
                p99 = np.percentile(slice_data, 99.5)
                if p99 > p1:
                    norm = np.clip((slice_data - p1) / (p99 - p1) * 255.0, 0, 255).astype(np.uint8)
                else:
                    norm = np.zeros_like(slice_data, dtype=np.uint8)

            if photometric == 'MONOCHROME1':
                norm = 255 - norm

            img = Image.fromarray(norm)
        else:
            # Color RGB slice
            img = Image.fromarray(slice_raw.astype(np.uint8))

        slice_filename = f"slice_{idx + 1:03d}.png"
        slice_filepath = os.path.join(output_dir, slice_filename)
        img.save(slice_filepath, "PNG", optimize=True)
        series_urls.append(f"/static/uploads/slices_{basename}/{slice_filename}")

    # Select representative primary slice (middle slice for 3D volumes)
    mid_index = max(0, total_slices // 2)
    primary_url = series_urls[mid_index] if series_urls else f"/static/uploads/{os.path.basename(dicom_path)}"

    # Generate detection and measurement tags from DICOM clinical metadata
    modality_name = "Brain MRI" if app_modality == "mri" else ("Chest Study" if app_modality == "cxr" else "CT Scan")
    desc_part = series_desc or study_desc or f"{modality_raw} Series"
    detection_label = f"{modality_name} — {desc_part} ({total_slices} Slices)"
    
    rows, cols = slices_list[0].shape[:2]
    measurements_label = f"{cols}x{rows} matrix · {total_slices} slices · DICOM {modality_raw}"

    return {
        "is_dicom": True,
        "primary_url": primary_url,
        "series_images": series_urls,
        "total_slices": total_slices,
        "modality": app_modality,
        "detection_label": detection_label,
        "measurements": measurements_label,
        "dicom_metadata": {
            "patient_name": patient_name,
            "patient_id": patient_id,
            "modality": modality_raw,
            "series_description": series_desc,
            "study_description": study_desc,
            "dimensions": f"{cols}x{rows}",
            "slices": total_slices,
            "photometric": photometric
        }
    }
