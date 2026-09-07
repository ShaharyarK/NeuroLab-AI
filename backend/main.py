from fastapi import FastAPI, Request, File, UploadFile, HTTPException, Depends, Security, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import torch
from PIL import Image
import io
import numpy as np
import tempfile
from sqlalchemy.orm import Session

from services.database import get_db, init_db, Base, engine
from services.auth_service import AuthService
from services.early_detection_service import early_detection_service
from services.llm_service import llm_service
from services.imaging_service import ImagingAnalysisService
from services.test_analysis_service import TestAnalysisService

from models.user import User
from models.patient import Patient, PatientRelationship, patient_consultants
from models.diagnostic import ImagingRecord, LabRecord, EarlyDetectionRecord

# Initialize DB tables and seeds
init_db()

app = FastAPI(
    title="NeuroLab AI — Clinical Intelligence & Diagnostic Suite",
    description="Next-generation multi-modality diagnostic platform with early disease detection, family patient hierarchies, and physician AI copilot.",
    version="2.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token", auto_error=False)

# Optional / Fallback image analysis services
imaging_services = {
    "xray": ImagingAnalysisService("xray"),
    "mri": ImagingAnalysisService("mri"),
    "ct": ImagingAnalysisService("ct")
}
test_service = TestAnalysisService()

# ------------------------------------------------------------------------------
# Pydantic Request / Response Models
# ------------------------------------------------------------------------------


class DoctorRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = "General Medicine"
    hospital_affiliation: Optional[str] = "NeuroLab Medical Center"
    role: Optional[str] = "lead_physician"


class DoctorLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class PatientCreateRequest(BaseModel):
    id: Optional[str] = None
    mrn: Optional[str] = None
    name: str
    age: int
    gender: str
    blood_group: Optional[str] = "O+"
    contact_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = "No known drug allergies (NKDA)"
    chief_complaint: Optional[str] = None
    case_status: Optional[str] = "REVIEWING"
    attending_doctor_id: Optional[int] = None
    consulting_doctor_ids: Optional[List[int]] = []
    # Optional direct family link on admission
    related_to_patient_id: Optional[str] = None
    relationship_type: Optional[str] = None
    relationship_notes: Optional[str] = None


class AddConsultantRequest(BaseModel):
    doctor_id: int


class FamilyLinkRequest(BaseModel):
    related_patient_id: str
    # "Mother", "Child", "Father", "Spouse", "Sibling", "Son", "Daughter", "Guardian", "Relative"
    relationship_type: str
    notes: Optional[str] = ""
    bidirectional: Optional[bool] = True


class EarlyDetectionRequest(BaseModel):
    lab_metrics: Optional[Dict[str, Any]] = None
    imaging_findings: Optional[Dict[str, Any]] = None


class LabRecordCreateRequest(BaseModel):
    category: str
    test_date: Optional[str] = None
    metrics: Dict[str, Any]
    abnormal_flags: Optional[List[str]] = []


class ImagingRecordCreateRequest(BaseModel):
    modality: str
    body_part: Optional[str] = "brain"
    detection: str
    confidence: Optional[float] = 90.0
    measurements: Optional[str] = ""
    image_url: Optional[str] = None
    series_images: Optional[List[str]] = []
    heatmap_url: Optional[str] = None
    bbox: Optional[Dict[str, Any]] = None

# Helper for inverse family relations


def is_female_gender(gender: Optional[str]) -> bool:
    g = (gender or "").strip().lower()
    return g in ["female", "f", "woman", "girl"]


def is_male_gender(gender: Optional[str]) -> bool:
    g = (gender or "").strip().lower()
    return g in ["male", "m", "man", "boy"]


def get_inverse_relationship(rel_type: str, patient_gender: str = "Other") -> str:
    r = (rel_type or "").strip().lower()
    is_f = is_female_gender(patient_gender)
    is_m = is_male_gender(patient_gender)

    if "mother" in r or "father" in r or "parent" in r:
        return "Child (Daughter)" if is_f else ("Child (Son)" if is_m else "Child")
    elif "child" in r or "daughter" in r or "son" in r:
        return "Mother" if is_f else ("Father" if is_m else "Parent")
    elif "spouse" in r or "husband" in r or "wife" in r or "partner" in r:
        return "Spouse / Partner"
    elif "sibling" in r or "brother" in r or "sister" in r:
        return "Sibling (Sister)" if is_f else ("Sibling (Brother)" if is_m else "Sibling")
    elif "grandchild" in r:
        return "Grandmother" if is_f else ("Grandfather" if is_m else "Grandparent")
    elif "grand" in r:
        return "Grandchild"
    elif "guardian" in r:
        return "Dependent"
    return "Relative"


def is_sibling_rel(rel_str: str) -> bool:
    r = (rel_str or "").strip().lower()
    return any(k in r for k in ["sibling", "brother", "sister"])


def is_parent_rel(rel_str: str) -> bool:
    r = (rel_str or "").strip().lower()
    return any(k in r for k in ["mother", "father", "parent"])


def is_child_rel(rel_str: str) -> bool:
    r = (rel_str or "").strip().lower()
    return any(k in r for k in ["child", "daughter", "son"])


def label_for_sibling(gender: str) -> str:
    if is_female_gender(gender):
        return "Sibling (Sister)"
    elif is_male_gender(gender):
        return "Sibling (Brother)"
    return "Sibling"


def label_for_child(gender: str) -> str:
    if is_female_gender(gender):
        return "Child (Daughter)"
    elif is_male_gender(gender):
        return "Child (Son)"
    return "Child"


def label_for_parent(gender: str) -> str:
    if is_female_gender(gender):
        return "Mother"
    elif is_male_gender(gender):
        return "Father"
    return "Parent"


def auto_sync_family_kinship(
    db: Session,
    patient_id_1: str,
    patient_id_2: str,
    rel_type_1_to_2: str,
    notes: Optional[str] = None
) -> None:
    """
    Intelligently synchronizes family kinship graph across all profiles.
    Example:
      If Shaharyar profile has brother Shayan, and then Alina is added as sister to Shaharyar,
      then Shayan and Alina automatically become brother/sister across all profiles without
      needing to re-add manually.
    """
    p1 = db.query(Patient).filter(Patient.id == patient_id_1).first()
    p2 = db.query(Patient).filter(Patient.id == patient_id_2).first()
    if not p1 or not p2 or p1.id == p2.id:
        return

    def set_or_create_link(from_id: str, to_id: str, rel_type: str, n: Optional[str] = None):
        if from_id == to_id:
            return
        link = db.query(PatientRelationship).filter(
            PatientRelationship.patient_id == from_id,
            PatientRelationship.related_patient_id == to_id
        ).first()
        if link:
            link.relationship_type = rel_type
            if n:
                link.notes = n
        else:
            link = PatientRelationship(
                patient_id=from_id,
                related_patient_id=to_id,
                relationship_type=rel_type,
                notes=n or "Family auto-sync link"
            )
            db.add(link)

    # 1. Establish direct reciprocal link between P1 and P2
    inverse_type = get_inverse_relationship(rel_type_1_to_2, p1.gender)
    set_or_create_link(p1.id, p2.id, rel_type_1_to_2,
                       notes or f"Linked to {p2.name}")
    set_or_create_link(p2.id, p1.id, inverse_type,
                       f"Linked to {p1.name} ({p1.id})")
    db.commit()

    # 2. Sibling Network Transitive Closure
    if is_sibling_rel(rel_type_1_to_2):
        sibling_ids = {p1.id, p2.id}
        changed = True
        while changed:
            changed = False
            current_ids = list(sibling_ids)
            for sid in current_ids:
                # Direct sibling links
                rels = db.query(PatientRelationship).filter(
                    PatientRelationship.patient_id == sid
                ).all()
                for r in rels:
                    if is_sibling_rel(r.relationship_type) and r.related_patient_id not in sibling_ids:
                        sibling_ids.add(r.related_patient_id)
                        changed = True

                # Siblings via shared parents
                for r in rels:
                    if is_parent_rel(r.relationship_type):
                        parent_id = r.related_patient_id
                        parent_rels = db.query(PatientRelationship).filter(
                            PatientRelationship.patient_id == parent_id
                        ).all()
                        for pr in parent_rels:
                            if is_child_rel(pr.relationship_type) and pr.related_patient_id not in sibling_ids:
                                sibling_ids.add(pr.related_patient_id)
                                changed = True

        all_sibs = db.query(Patient).filter(Patient.id.in_(sibling_ids)).all()
        sib_map = {s.id: s for s in all_sibs}

        # Pairwise sibling synchronization for all members of the sibling cluster
        for s_from in sibling_ids:
            for s_to in sibling_ids:
                if s_from != s_to and s_to in sib_map and s_from in sib_map:
                    rel_label = label_for_sibling(sib_map[s_to].gender)
                    set_or_create_link(
                        s_from,
                        s_to,
                        rel_label,
                        f"Auto-synced sibling link ({sib_map[s_from].name} ↔ {sib_map[s_to].name})"
                    )

        # Synchronize shared parents across all siblings
        parent_ids = set()
        for sid in sibling_ids:
            rels = db.query(PatientRelationship).filter(
                PatientRelationship.patient_id == sid
            ).all()
            for r in rels:
                if is_parent_rel(r.relationship_type):
                    parent_ids.add(r.related_patient_id)

        all_parents = db.query(Patient).filter(
            Patient.id.in_(parent_ids)).all()
        for parent_obj in all_parents:
            for sid in sibling_ids:
                if sid in sib_map:
                    # Parent -> Child
                    set_or_create_link(
                        parent_obj.id,
                        sid,
                        label_for_child(sib_map[sid].gender),
                        f"Auto-synced child of {parent_obj.name}"
                    )
                    # Child -> Parent
                    set_or_create_link(
                        sid,
                        parent_obj.id,
                        label_for_parent(parent_obj.gender),
                        f"Auto-synced parent ({parent_obj.name})"
                    )

        db.commit()

    # 3. Parent <-> Child Sibling Expansion
    parent_id = None
    new_child_id = None
    if is_child_rel(rel_type_1_to_2):
        parent_id = p1.id
        new_child_id = p2.id
    elif is_parent_rel(rel_type_1_to_2):
        parent_id = p2.id
        new_child_id = p1.id

    if parent_id and new_child_id:
        parent_children_rels = db.query(PatientRelationship).filter(
            PatientRelationship.patient_id == parent_id
        ).all()
        children_ids = {
            r.related_patient_id for r in parent_children_rels if is_child_rel(r.relationship_type)
        }
        children_ids.add(new_child_id)

        if len(children_ids) > 1:
            child_patients = db.query(Patient).filter(
                Patient.id.in_(children_ids)).all()
            c_map = {c.id: c for c in child_patients}
            parent_obj = db.query(Patient).filter(
                Patient.id == parent_id).first()
            p_name = parent_obj.name if parent_obj else "Parent"

            for c1 in children_ids:
                for c2 in children_ids:
                    if c1 != c2 and c1 in c_map and c2 in c_map:
                        set_or_create_link(
                            c1,
                            c2,
                            label_for_sibling(c_map[c2].gender),
                            f"Auto-synced sibling via parent {p_name}"
                        )
            db.commit()

# Auth dependency


async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        return AuthService.verify_token(token, db)
    except Exception:
        return None

# ==============================================================================
# Doctor Authentication Endpoints
# ==============================================================================


@app.post("/api/auth/register", response_model=TokenResponse)
def register_doctor(req: DoctorRegisterRequest, db: Session = Depends(get_db)):
    """Register a new physician account with medical specialty and license."""
    user = AuthService.create_user(
        username=req.username,
        email=req.email,
        password=req.password,
        full_name=req.full_name or f"Dr. {req.username.capitalize()}, MD",
        license_number=req.license_number or f"MD-{abs(hash(req.username)) % 90000 + 10000}",
        specialty=req.specialty or "Clinical Specialist",
        hospital_affiliation=req.hospital_affiliation or "NeuroLab Medical Center",
        role=req.role or "lead_physician",
        db=db
    )
    token = AuthService.create_access_token(data={"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login_doctor(req: DoctorLoginRequest, db: Session = Depends(get_db)):
    """Authenticate physician credentials and issue JWT session token."""
    user = AuthService.authenticate_user(req.username, req.password, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials. Please verify your doctor username/email and password."
        )
    token = AuthService.create_access_token(data={"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@app.get("/api/auth/me")
def get_current_doctor_profile(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Retrieve logged-in doctor profile."""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = AuthService.verify_token(token, db)
    return {"user": user.to_dict()}


@app.get("/api/doctors")
def list_doctors(db: Session = Depends(get_db)):
    """List all registered medical specialists available for consultation."""
    doctors = AuthService.get_all_doctors(db)
    return {"doctors": [d.to_dict() for d in doctors], "total": len(doctors)}

# Compatibility endpoint for OAuth2 form


@app.post("/token")
def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(
        form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    token = AuthService.create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

# ==============================================================================
# Patient Management & Family Lineage Hierarchy Endpoints
# ==============================================================================


def build_patient_full_profile(patient: Patient, db: Session) -> Dict[str, Any]:
    """
    Build complete clinical patient case profile including attending staff,
    family hierarchy links, specific imaging records, and pathology lab metrics.
    If patient has no scans or labs yet (intake status), returns truthful baseline values
    instead of defaulting to malignant Glioblastoma.
    """
    p_dict = patient.to_dict()

    # Always query fresh family relationships directly from DB
    fresh_family = db.query(PatientRelationship).filter(PatientRelationship.patient_id == patient.id).all()
    p_dict["family_members"] = [rel.to_dict() for rel in fresh_family]

    # Query imaging studies for this specific patient
    img_list = db.query(ImagingRecord).filter(
        ImagingRecord.patient_id == patient.id).order_by(ImagingRecord.created_at.desc()).all()
    mri_rec = next((i for i in img_list if i.modality == "mri"), None)
    cxr_rec = next((i for i in img_list if i.modality in [
                   "cxr", "ct", "xray"]), None)

    # Query lab records for this specific patient
    labs_list = db.query(LabRecord).filter(LabRecord.patient_id == patient.id).order_by(
        LabRecord.test_date.desc(), LabRecord.created_at.desc()).all()

    # 1. MRI Evaluation
    if mri_rec:
        mri_imgs = mri_rec.series_images_json or (
            [mri_rec.image_url] if mri_rec.image_url else [])
        primary_mri_url = mri_rec.image_url or (
            mri_imgs[0] if mri_imgs else None)
        if primary_mri_url and primary_mri_url.endswith(".dcm"):
            from services.dicom_service import is_dicom_file, process_dicom_file
            disk_p = "static" + primary_mri_url.replace("/static", "")
            if os.path.exists(disk_p) and is_dicom_file(disk_p):
                try:
                    d_res = process_dicom_file(disk_p, "static/uploads")
                    mri_rec.image_url = primary_mri_url = d_res["primary_url"]
                    mri_rec.series_images_json = mri_imgs = d_res["series_images"]
                    db.commit()
                except Exception:
                    pass

        p_dict["mri"] = {
            "status": "ready",
            "has_scan": True,
            "detection": mri_rec.detection,
            "modality": f"{mri_rec.body_part.title()} MRI ({mri_rec.measurements or 'Standard'})",
            "location": mri_rec.measurements or "Brain Parenchyma",
            "malignancy_risk": mri_rec.confidence,
            "edema": "Vasogenic edema / mass effect present" if "edema" in (mri_rec.measurements or "").lower() else "No significant edema detected",
            "image_url": primary_mri_url or "/static/mri_preview.png",
            "series_images": mri_imgs,
            "total_images": len(mri_imgs)
        }
    elif patient.id == "NL0194":
        # Sarah Johnson reference prototype case
        p_dict["mri"] = {
            "status": "ready",
            "has_scan": True,
            "detection": "Detection - Glioblastoma Multiforme",
            "modality": "Brain MRI (T1+Gd / FLAIR)",
            "location": "Left Temporal Lobe (32mm x 28mm)",
            "malignancy_risk": 94.7,
            "edema": "Marked vasogenic edema with 2.4mm midline shift",
            "image_url": "/static/mri_preview.png",
            "series_images": ["/static/mri_preview.png"],
            "total_images": 1
        }
    else:
        # Awaiting scan ingestion / baseline workup
        p_dict["mri"] = {
            "status": "pending",
            "has_scan": False,
            "detection": f"Awaiting Study — Chief Complaint: {patient.chief_complaint}",
            "modality": "Brain MRI (Study Pending)",
            "location": "No Imaging Uploaded Yet",
            "malignancy_risk": 0.0,
            "edema": "N/A - Pending Diagnostic Study",
            "image_url": None,
            "series_images": [],
            "total_images": 0
        }

    # 2. Chest X-Ray / CT Evaluation
    if cxr_rec:
        cxr_imgs = cxr_rec.series_images_json or (
            [cxr_rec.image_url] if cxr_rec.image_url else [])
        p_dict["cxr"] = {
            "status": "ready",
            "has_scan": True,
            "detection": cxr_rec.detection,
            "modality": f"Chest {cxr_rec.modality.upper()}",
            "segmentation_score": cxr_rec.confidence,
            "pneumonia_score": 12.3 if "nodule" in cxr_rec.detection.lower() else (cxr_rec.confidence if "pneumonia" in cxr_rec.detection.lower() else 5.0),
            "location": cxr_rec.measurements or "Thoracic Field",
            "image_url": cxr_rec.image_url or (cxr_imgs[0] if cxr_imgs else "/static/cxr_preview.png"),
            "series_images": cxr_imgs,
            "total_images": len(cxr_imgs)
        }
    elif patient.id == "NL0194":
        p_dict["cxr"] = {
            "status": "ready",
            "has_scan": True,
            "detection": "Pulmonary Nodules (Right Lung Apex, 14mm)",
            "modality": "Chest X-Ray / CT",
            "segmentation_score": 88.1,
            "pneumonia_score": 12.3,
            "location": "Right Upper Lobe / Apex",
            "image_url": "/static/cxr_preview.png",
            "series_images": ["/static/cxr_preview.png"],
            "total_images": 1
        }
    else:
        p_dict["cxr"] = {
            "status": "pending",
            "has_scan": False,
            "detection": "Awaiting Study — Chest Imaging Pending Upload",
            "modality": "Chest X-Ray (Study Pending)",
            "segmentation_score": 0.0,
            "pneumonia_score": 0.0,
            "location": "No Imaging Uploaded Yet",
            "image_url": None,
            "series_images": [],
            "total_images": 0
        }

    # 3. Pathology Labs
    records_data = [l.to_dict() for l in labs_list]

    # Group by test_date for chronological history
    history_map = {}
    for l in labs_list:
        d = l.test_date or (l.created_at.strftime(
            "%Y-%m-%d") if l.created_at else "Unknown")
        if d not in history_map:
            history_map[d] = {
                "test_date": d,
                "records": [],
                "categories": [],
                "panels": {
                    "cbc": {},
                    "biomarkers": {},
                    "lft": {},
                    "kft": {},
                    "lipid": {},
                    "endocrine": {},
                    "urinalysis": {}
                },
                "abnormal_flags": [],
                "total_metrics": 0,
                "total_abnormal": 0
            }
        rec_dict = l.to_dict()
        history_map[d]["records"].append(rec_dict)
        cat = (l.category or "").lower()
        if cat not in history_map[d]["categories"]:
            history_map[d]["categories"].append(cat)

        cat_norm = "cbc" if cat in ["cbc", "hematology"] else \
                   "biomarkers" if cat in ["biomarkers", "bio", "oncology"] else \
                   "lft" if cat in ["lft", "liver"] else \
                   "kft" if cat in ["kft", "kidney", "renal"] else \
                   "lipid" if cat in ["lipid", "lipids", "cholesterol"] else \
                   "endocrine" if cat in ["endocrine", "glycemic", "metabolic"] else \
                   "urinalysis" if cat in ["urinalysis", "urine"] else cat

        if cat_norm not in history_map[d]["panels"]:
            history_map[d]["panels"][cat_norm] = {}
        if l.metrics_json:
            history_map[d]["panels"][cat_norm].update(l.metrics_json)
            history_map[d]["total_metrics"] += len(l.metrics_json)
            for m_key, m_val in l.metrics_json.items():
                if isinstance(m_val, dict) and m_val.get("status") in ["high", "low", "abnormal", "critical"]:
                    history_map[d]["total_abnormal"] += 1

        for flg in (l.abnormal_flags_json or []):
            if flg not in history_map[d]["abnormal_flags"]:
                history_map[d]["abnormal_flags"].append(flg)

    history_by_date = sorted(history_map.values(
    ), key=lambda x: x["test_date"], reverse=True)
    all_dates = [h["test_date"] for h in history_by_date]

    # Build latest flat views
    labs_data = {
        "cbc": {},
        "biomarkers": {},
        "lft": {},
        "kft": {},
        "lipid": {},
        "endocrine": {},
        "urinalysis": {},
        "has_labs": len(labs_list) > 0,
        "records": records_data,
        "history_by_date": history_by_date,
        "all_dates": all_dates
    }
    # Populate flat panels from latest records (since labs_list is sorted test_date desc)
    for l in labs_list:
        cat = (l.category or "").lower()
        cat_norm = "cbc" if cat in ["cbc", "hematology"] else \
                   "biomarkers" if cat in ["biomarkers", "bio", "oncology"] else \
                   "lft" if cat in ["lft", "liver"] else \
                   "kft" if cat in ["kft", "kidney", "renal"] else \
                   "lipid" if cat in ["lipid", "lipids", "cholesterol"] else \
                   "endocrine" if cat in ["endocrine", "glycemic", "metabolic"] else \
                   "urinalysis" if cat in ["urinalysis", "urine"] else cat

        if cat_norm in labs_data and l.metrics_json:
            for k, v in l.metrics_json.items():
                if k not in labs_data[cat_norm]:
                    labs_data[cat_norm][k] = v

    has_any_values = any(len(v) > 0 for k, v in labs_data.items() if k not in [
                         "has_labs", "records", "history_by_date", "all_dates"])
    if labs_data["has_labs"] and has_any_values:
        p_dict["labs"] = labs_data
    elif patient.id == "NL0194":
        # Sarah Johnson reference complete multi-panel laboratory profile
        sarah_cbc = {
            "Hemoglobin": {"value": 12.1, "unit": "g/dL", "status": "normal", "ref": "12.0-17.5"},
            "WBC": {"value": 8.9, "unit": "K/mcL", "status": "normal", "ref": "4.5-11.0"},
            "Platelets": {"value": 210, "unit": "K/mcL", "status": "normal", "ref": "150-450"},
            "RBC": {"value": 4.2, "unit": "M/mcL", "status": "normal", "ref": "4.0-5.9"},
            "Hematocrit": {"value": 37.5, "unit": "%", "status": "normal", "ref": "36.0-50.0"}
        }
        sarah_bio = {
            "hs_CRP": {"value": 32.0, "unit": "mg/L", "status": "high", "ref": "< 5.0"},
            "Ferritin": {"value": 450, "unit": "ng/mL", "status": "high", "ref": "15-200"},
            "LDH": {"value": 245, "unit": "U/L", "status": "high", "ref": "140-220"},
            "CEA": {"value": 4.8, "unit": "ng/mL", "status": "high", "ref": "< 3.0"},
            "CA125": {"value": 22.0, "unit": "U/mL", "status": "normal", "ref": "< 35.0"}
        }
        sarah_lft = {
            "ALT": {"value": 42, "unit": "U/L", "status": "normal", "ref": "7-56"},
            "AST": {"value": 38, "unit": "U/L", "status": "normal", "ref": "10-40"},
            "Total_Bilirubin": {"value": 0.9, "unit": "mg/dL", "status": "normal", "ref": "0.1-1.2"},
            "ALP": {"value": 88, "unit": "U/L", "status": "normal", "ref": "44-147"},
            "Albumin": {"value": 4.1, "unit": "g/dL", "status": "normal", "ref": "3.4-5.4"}
        }
        sarah_kft = {
            "Serum_Creatinine": {"value": 1.25, "unit": "mg/dL", "status": "high", "ref": "0.6-1.2"},
            "BUN": {"value": 18, "unit": "mg/dL", "status": "normal", "ref": "7-20"},
            "eGFR": {"value": 78, "unit": "mL/min/1.73m²", "status": "low", "ref": "90-140"},
            "Sodium": {"value": 140, "unit": "mEq/L", "status": "normal", "ref": "135-145"},
            "Potassium": {"value": 4.3, "unit": "mEq/L", "status": "normal", "ref": "3.5-5.0"}
        }
        sarah_lipid = {
            "Triglycerides": {"value": 240, "unit": "mg/dL", "status": "high", "ref": "50-150"},
            "HDL": {"value": 38, "unit": "mg/dL", "status": "low", "ref": "40-90"},
            "LDL": {"value": 138, "unit": "mg/dL", "status": "high", "ref": "50-100"},
            "Total_Cholesterol": {"value": 218, "unit": "mg/dL", "status": "high", "ref": "120-200"}
        }
        sarah_endocrine = {
            "Fasting_Glucose": {"value": 118, "unit": "mg/dL", "status": "high", "ref": "70-99"},
            "Fasting_Insulin": {"value": 18.0, "unit": "uIU/mL", "status": "normal", "ref": "2.6-24.9"},
            "HbA1c": {"value": 5.9, "unit": "%", "status": "high", "ref": "4.0-5.6"},
            "TSH": {"value": 2.1, "unit": "uIU/mL", "status": "normal", "ref": "0.4-4.0"}
        }
        sarah_urinalysis = {
            "Urine_Color": {"value": "Amber", "unit": "", "status": "normal", "ref": "Straw/Yellow"},
            "Specific_Gravity": {"value": 1.020, "unit": "", "status": "normal", "ref": "1.005-1.030"},
            "Urine_pH": {"value": 6.2, "unit": "", "status": "normal", "ref": "4.5-8.0"},
            "Protein": {"value": "Trace", "unit": "", "status": "normal", "ref": "Negative"},
            "Leukocyte_Esterase": {"value": "Negative", "unit": "", "status": "normal", "ref": "Negative"}
        }
        sarah_records = [
            {"id": 9991, "patient_id": "NL0194", "category": "cbc",
                "test_date": "2026-09-01", "metrics": sarah_cbc, "abnormal_flags": []},
            {"id": 9992, "patient_id": "NL0194", "category": "biomarkers", "test_date": "2026-09-01", "metrics": sarah_bio,
                "abnormal_flags": ["Elevated hs_CRP", "Elevated Ferritin", "Elevated LDH", "Elevated CEA"]},
            {"id": 9993, "patient_id": "NL0194", "category": "lft",
                "test_date": "2026-09-01", "metrics": sarah_lft, "abnormal_flags": []},
            {"id": 9994, "patient_id": "NL0194", "category": "kft", "test_date": "2026-09-01",
                "metrics": sarah_kft, "abnormal_flags": ["Elevated Serum Creatinine", "Low eGFR"]},
            {"id": 9995, "patient_id": "NL0194", "category": "lipid", "test_date": "2026-09-01",
                "metrics": sarah_lipid, "abnormal_flags": ["Elevated Triglycerides", "Low HDL", "Elevated LDL"]},
            {"id": 9996, "patient_id": "NL0194", "category": "endocrine", "test_date": "2026-09-01",
                "metrics": sarah_endocrine, "abnormal_flags": ["Elevated Fasting Glucose", "Elevated HbA1c"]},
            {"id": 9997, "patient_id": "NL0194", "category": "urinalysis",
                "test_date": "2026-09-01", "metrics": sarah_urinalysis, "abnormal_flags": []}
        ]
        sarah_history = [{
            "test_date": "2026-09-01",
            "records": sarah_records,
            "categories": ["cbc", "biomarkers", "lft", "kft", "lipid", "endocrine", "urinalysis"],
            "panels": {
                "cbc": sarah_cbc,
                "biomarkers": sarah_bio,
                "lft": sarah_lft,
                "kft": sarah_kft,
                "lipid": sarah_lipid,
                "endocrine": sarah_endocrine,
                "urinalysis": sarah_urinalysis
            },
            "abnormal_flags": ["Elevated hs_CRP (32.0 mg/L)", "Elevated Ferritin (450 ng/mL)", "Elevated LDH (245 U/L)", "Elevated CEA (4.8 ng/mL)", "Elevated Serum Creatinine (1.25 mg/dL)", "Elevated Triglycerides (240 mg/dL)", "Elevated Fasting Glucose (118 mg/dL)"],
            "total_metrics": 29,
            "total_abnormal": 10
        }]
        p_dict["labs"] = {
            "has_labs": True,
            "cbc": sarah_cbc,
            "biomarkers": sarah_bio,
            "lft": sarah_lft,
            "kft": sarah_kft,
            "lipid": sarah_lipid,
            "endocrine": sarah_endocrine,
            "urinalysis": sarah_urinalysis,
            "records": sarah_records,
            "history_by_date": sarah_history,
            "all_dates": ["2026-09-01"]
        }
    else:
        # Awaiting laboratory orders - no blood tests on file yet
        p_dict["labs"] = {
            "has_labs": False,
            "status": "pending_order",
            "cbc": {},
            "biomarkers": {},
            "lft": {},
            "kft": {},
            "lipid": {},
            "endocrine": {},
            "urinalysis": {},
            "records": [],
            "history_by_date": [],
            "all_dates": []
        }

    return p_dict


@app.get("/api/patients")
def get_all_patients(
    search: Optional[str] = Query(
        None, description="Search by name, ID or MRN"),
    status: Optional[str] = Query(
        None, description="Filter by status (REVIEWING, TRIAGE, CRITICAL, DISCHARGED)"),
    doctor_id: Optional[int] = Query(
        None, description="Filter by attending or consulting doctor"),
    db: Session = Depends(get_db)
):
    """List all admitted hospital patients with their attending team, family links, and diagnostic data."""
    query = db.query(Patient)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Patient.name.ilike(s)) | (
            Patient.id.ilike(s)) | (Patient.mrn.ilike(s)))

    if status and status.upper() != "ALL":
        query = query.filter(Patient.case_status == status.upper())

    if doctor_id:
        query = query.filter(
            (Patient.attending_doctor_id == doctor_id) |
            (Patient.consulting_doctors.any(User.id == doctor_id))
        )

    patients = query.order_by(Patient.created_at.desc()).all()
    return {"patients": [build_patient_full_profile(p, db) for p in patients], "total": len(patients)}


@app.post("/api/patients")
def admit_new_patient(req: PatientCreateRequest, db: Session = Depends(get_db)):
    """Admit a new patient into the hospital system, with optional family relationship."""
    # Generate unique ID if not given
    patient_id = req.id
    if not patient_id:
        count = db.query(Patient).count() + 1
        patient_id = f"NL{count:04d}"
        while db.query(Patient).filter(Patient.id == patient_id).first():
            count += 1
            patient_id = f"NL{count:04d}"

    # Verify ID not existing
    if db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(
            status_code=400, detail=f"Patient ID {patient_id} already exists")

    # MRN
    mrn = req.mrn or f"MRN-{abs(hash(patient_id)) % 900000 + 100000}"

    patient = Patient(
        id=patient_id,
        mrn=mrn,
        name=req.name,
        age=req.age,
        gender=req.gender,
        blood_group=req.blood_group or "O+",
        contact_number=req.contact_number,
        emergency_contact=req.emergency_contact,
        allergies=req.allergies or "No known drug allergies (NKDA)",
        chief_complaint=req.chief_complaint or "General diagnostic evaluation",
        case_status=req.case_status or "REVIEWING",
        attending_doctor_id=req.attending_doctor_id
    )

    # Attach consulting specialists if requested
    if req.consulting_doctor_ids:
        docs = db.query(User).filter(
            User.id.in_(req.consulting_doctor_ids)).all()
        for doc in docs:
            patient.consulting_doctors.append(doc)

    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Establish family relationship if requested at admission with full auto-sync
    if req.related_to_patient_id and req.relationship_type:
        related_p = db.query(Patient).filter(
            Patient.id == req.related_to_patient_id).first()
        if related_p:
            auto_sync_family_kinship(
                db,
                patient.id,
                related_p.id,
                req.relationship_type,
                req.relationship_notes or "Linked at hospital admission"
            )
            db.refresh(patient)

    return {"status": "success", "patient": build_patient_full_profile(patient, db)}


@app.get("/api/patients/{patient_id}")
def get_patient_details(patient_id: str, db: Session = Depends(get_db)):
    """Get full clinical details, attending specialists, family tree, imaging, and labs of a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail=f"Patient {patient_id} not found")
    return {"patient": build_patient_full_profile(patient, db)}


@app.put("/api/patients/{patient_id}")
def update_patient_details(patient_id: str, updates: Dict[str, Any], db: Session = Depends(get_db)):
    """Update patient clinical status, triage level, or contact details."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=404, detail=f"Patient {patient_id} not found")

    allowed_fields = ["name", "age", "gender", "blood_group", "contact_number",
                      "emergency_contact", "allergies", "chief_complaint", "case_status", "attending_doctor_id"]
    for field in allowed_fields:
        if field in updates:
            setattr(patient, field, updates[field])

    db.commit()
    db.refresh(patient)
    return {"status": "success", "patient": build_patient_full_profile(patient, db)}

# ==============================================================================
# Multi-Doctor Collaboration Endpoints
# ==============================================================================


@app.post("/api/patients/{patient_id}/consultants")
def add_consulting_doctor(patient_id: str, req: AddConsultantRequest, db: Session = Depends(get_db)):
    """Assign another medical specialist/consultant to a patient case."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = db.query(User).filter(User.id == req.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if doctor not in patient.consulting_doctors:
        patient.consulting_doctors.append(doctor)
        db.commit()
        db.refresh(patient)

    return {
        "status": "success",
        "message": f"{doctor.full_name} assigned as consultant",
        "consulting_doctors": [d.to_dict() for d in patient.consulting_doctors]
    }


@app.delete("/api/patients/{patient_id}/consultants/{doctor_id}")
def remove_consulting_doctor(patient_id: str, doctor_id: int, db: Session = Depends(get_db)):
    """Remove a consulting doctor from a patient case."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = db.query(User).filter(User.id == doctor_id).first()
    if doctor and doctor in patient.consulting_doctors:
        patient.consulting_doctors.remove(doctor)
        db.commit()
        db.refresh(patient)

    return {
        "status": "success",
        "message": "Consultant removed",
        "consulting_doctors": [d.to_dict() for d in patient.consulting_doctors]
    }

# ==============================================================================
# Patient Family & Lineage Hierarchy Endpoints
# ==============================================================================


@app.get("/api/patients/{patient_id}/family")
def get_patient_family(patient_id: str, db: Session = Depends(get_db)):
    """Retrieve family hierarchy for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    family_rels = db.query(PatientRelationship).filter(
        PatientRelationship.patient_id == patient_id
    ).all()
    family = [rel.to_dict() for rel in family_rels]
    return {"patient_id": patient_id, "family_members": family, "total": len(family)}


@app.post("/api/patients/{patient_id}/family")
def add_patient_family_link(patient_id: str, req: FamilyLinkRequest, db: Session = Depends(get_db)):
    """
    Establish a family/hierarchical link between two hospital patients.
    Supports Mother <-> Child, Sibling, Spouse, and automatically syncs kinship across all connected profiles.
    """
    if patient_id == req.related_patient_id:
        raise HTTPException(
            status_code=400, detail="Cannot link patient to themselves")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    related_p = db.query(Patient).filter(
        Patient.id == req.related_patient_id).first()

    if not patient:
        raise HTTPException(
            status_code=404, detail=f"Patient {patient_id} not found")
    if not related_p:
        raise HTTPException(
            status_code=404, detail=f"Related patient {req.related_patient_id} not found")

    # Perform intelligent multi-profile kinship synchronization
    auto_sync_family_kinship(
        db=db,
        patient_id_1=patient.id,
        patient_id_2=related_p.id,
        rel_type_1_to_2=req.relationship_type,
        notes=req.notes
    )

    # Query fresh relationships directly
    family_rels = db.query(PatientRelationship).filter(
        PatientRelationship.patient_id == patient_id
    ).all()

    return {
        "status": "success",
        "message": f"Linked {related_p.name} as {req.relationship_type} of {patient.name} with automatic family sync",
        "family_members": [rel.to_dict() for rel in family_rels]
    }


@app.delete("/api/patients/{patient_id}/family/{relationship_id}")
def remove_patient_family_link(patient_id: str, relationship_id: int, db: Session = Depends(get_db)):
    """Remove a family connection bidirectionally."""
    rel = db.query(PatientRelationship).filter(
        PatientRelationship.id == relationship_id,
        PatientRelationship.patient_id == patient_id
    ).first()

    if not rel:
        raise HTTPException(status_code=404, detail="Family link not found")

    related_id = rel.related_patient_id
    reciprocal = db.query(PatientRelationship).filter(
        PatientRelationship.patient_id == related_id,
        PatientRelationship.related_patient_id == patient_id
    ).first()

    db.delete(rel)
    if reciprocal:
        db.delete(reciprocal)
    db.commit()

    remaining_family = db.query(PatientRelationship).filter(
        PatientRelationship.patient_id == patient_id
    ).all()

    return {
        "status": "success",
        "message": "Family link removed",
        "family_members": [r.to_dict() for r in remaining_family]
    }

# ==============================================================================
# Early Disease Detection AI Engine Endpoints
# ==============================================================================


@app.get("/api/patients/{patient_id}/early-detection")
def get_patient_early_detection(patient_id: str, db: Session = Depends(get_db)):
    """Fetch latest early disease detection analysis and preventative action plan."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    record = db.query(EarlyDetectionRecord).filter(
        EarlyDetectionRecord.patient_id == patient_id
    ).order_by(EarlyDetectionRecord.created_at.desc()).first()

    if record:
        return {"status": "success", "record": record.to_dict()}

    # If no record yet, calculate baseline based on patient labs or standard profile
    labs = db.query(LabRecord).filter(LabRecord.patient_id == patient_id).all()
    aggregated_metrics = {}
    for l in labs:
        aggregated_metrics.update(l.metrics_json)

    result = early_detection_service.calculate_subclinical_risk(
        patient_age=patient.age,
        patient_gender=patient.gender,
        lab_metrics=aggregated_metrics
    )

    return {"status": "baseline", "record": {
        "oncology_risk": result["oncology_risk"]["score"],
        "cardiovascular_risk": result["cardiovascular_risk"]["score"],
        "metabolic_risk": result["metabolic_risk"]["score"],
        "renal_stress_risk": result["renal_stress"]["score"],
        "hepatic_stress_risk": result["hepatic_stress"]["score"],
        "summary_flags": result["early_warning_flags"],
        "action_plan": result["preventative_action_plan"],
        "full_analysis": result
    }}


@app.post("/api/patients/{patient_id}/early-detection")
def run_early_detection_analysis(
    patient_id: str,
    req: EarlyDetectionRequest,
    db: Session = Depends(get_db)
):
    """
    Run subclinical early disease detection AI engine.
    Analyzes lab biomarkers, imaging findings, and family risk factors.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Aggregate existing labs if not explicitly supplied
    lab_metrics = req.lab_metrics or {}
    if not lab_metrics:
        labs = db.query(LabRecord).filter(
            LabRecord.patient_id == patient_id).all()
        for l in labs:
            lab_metrics.update(l.metrics_json)

    imaging_findings = req.imaging_findings or {}
    if not imaging_findings:
        img_records = db.query(ImagingRecord).filter(
            ImagingRecord.patient_id == patient_id).all()
        for img in img_records:
            if img.modality == "mri" and "shift" in (img.measurements or "").lower():
                imaging_findings["midline_shift_mm"] = 2.4
                imaging_findings["edema_present"] = True
            if img.modality == "cxr" and "nodule" in (img.detection or "").lower():
                imaging_findings["nodule_size_mm"] = 14
                imaging_findings["ggo_present"] = True

    # Compute risk scores
    result = early_detection_service.calculate_subclinical_risk(
        patient_age=patient.age,
        patient_gender=patient.gender,
        lab_metrics=lab_metrics,
        imaging_findings=imaging_findings
    )

    # Persist record in PostgreSQL
    new_record = EarlyDetectionRecord(
        patient_id=patient_id,
        oncology_risk=result["oncology_risk"]["score"],
        cardiovascular_risk=result["cardiovascular_risk"]["score"],
        metabolic_risk=result["metabolic_risk"]["score"],
        renal_stress_risk=result["renal_stress"]["score"],
        hepatic_stress_risk=result["hepatic_stress"]["score"],
        summary_flags=result["early_warning_flags"],
        action_plan=result["preventative_action_plan"]
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "status": "success",
        "record": new_record.to_dict(),
        "detailed_analysis": result
    }

# ==============================================================================
# Full Laboratory Testing Suite Endpoints
# ==============================================================================


@app.get("/api/patients/{patient_id}/labs")
def get_patient_labs(patient_id: str, db: Session = Depends(get_db)):
    """Fetch all laboratory diagnostic panels with date history (Hematology, Biomarkers, LFT, KFT, Lipid, Endocrine)."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    full_profile = build_patient_full_profile(patient, db)
    labs_data = full_profile.get("labs", {})
    return {
        "patient_id": patient_id,
        "labs": labs_data,
        "records": labs_data.get("records", []),
        "history_by_date": labs_data.get("history_by_date", []),
        "all_dates": labs_data.get("all_dates", []),
        "total": len(labs_data.get("records", []))
    }


@app.post("/api/patients/{patient_id}/labs")
def add_patient_lab_record(patient_id: str, req: LabRecordCreateRequest, db: Session = Depends(get_db)):
    """Add a new laboratory test panel result into the patient's record."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    lab = LabRecord(
        patient_id=patient_id,
        category=req.category,
        test_date=req.test_date or datetime.now().strftime("%Y-%m-%d"),
        metrics_json=req.metrics,
        abnormal_flags_json=req.abnormal_flags or []
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)

    return {"status": "success", "lab": lab.to_dict(), "patient": build_patient_full_profile(patient, db)}


@app.delete("/api/patients/{patient_id}/labs/{lab_id}")
def delete_patient_lab_record(patient_id: str, lab_id: int, db: Session = Depends(get_db)):
    """Delete an individual laboratory test panel record by ID."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    lab = db.query(LabRecord).filter(LabRecord.id == lab_id,
                                     LabRecord.patient_id == patient_id).first()
    if not lab:
        # Check if fallback synthetic id for Sarah Johnson
        if patient_id == "NL0194" and lab_id in [9991, 9992, 9993, 9994, 9995, 9996, 9997]:
            return {
                "status": "success",
                "message": f"Sample lab record {lab_id} cleared",
                "patient": build_patient_full_profile(patient, db)
            }
        raise HTTPException(status_code=404, detail="Lab record not found")

    db.delete(lab)
    db.commit()

    return {
        "status": "success",
        "message": f"Lab record {lab_id} deleted successfully",
        "patient": build_patient_full_profile(patient, db)
    }


@app.delete("/api/patients/{patient_id}/labs/date/{test_date}")
def delete_patient_labs_by_date(patient_id: str, test_date: str, db: Session = Depends(get_db)):
    """Delete all laboratory test panel records recorded on a specific test date."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    records = db.query(LabRecord).filter(
        LabRecord.patient_id == patient_id, LabRecord.test_date == test_date).all()
    count = len(records)
    for rec in records:
        db.delete(rec)
    db.commit()

    return {
        "status": "success",
        "deleted_count": count,
        "message": f"Deleted {count} lab record(s) for date {test_date}",
        "patient": build_patient_full_profile(patient, db)
    }

# ==============================================================================
# Imaging Records & Upload Endpoints
# ==============================================================================


@app.post("/api/upload-scan-file")
async def upload_scan_file(file: UploadFile = File(...)):
    """Upload a raw medical scan image/file and save to static/uploads directory."""
    upload_dir = os.path.join("static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    import time
    clean_filename = file.filename.replace(" ", "_").replace("/", "_")
    safe_name = f"scan_{int(time.time()*1000)}_{clean_filename}"
    file_path = os.path.join(upload_dir, safe_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Check if uploaded file is a DICOM medical study (.dcm or DICM magic header)
    from services.dicom_service import is_dicom_file, process_dicom_file
    if is_dicom_file(file_path):
        try:
            dicom_res = process_dicom_file(file_path, "static/uploads")
            return {
                "status": "success",
                "is_dicom": True,
                "url": dicom_res["primary_url"],
                "series_images": dicom_res["series_images"],
                "total_slices": dicom_res["total_slices"],
                "modality": dicom_res["modality"],
                "detection": dicom_res["detection_label"],
                "measurements": dicom_res["measurements"],
                "dicom_metadata": dicom_res["dicom_metadata"],
                "raw_file_url": f"/static/uploads/{safe_name}",
                "filename": file.filename
            }
        except Exception as dcm_err:
            print(
                f"[DICOM Warning] Failed to process DICOM dataset: {dcm_err}")

    return {
        "status": "success",
        "is_dicom": False,
        "url": f"/static/uploads/{safe_name}",
        "series_images": [f"/static/uploads/{safe_name}"],
        "total_slices": 1,
        "filename": file.filename
    }


@app.post("/api/upload-multiple-scans")
async def upload_multiple_scans(files: List[UploadFile] = File(...)):
    """Upload multiple medical scan pictures/slices simultaneously."""
    upload_dir = os.path.join("static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    import time
    uploads = []
    base_time = int(time.time() * 1000)
    for idx, f in enumerate(files):
        clean_filename = f.filename.replace(" ", "_").replace("/", "_")
        safe_name = f"scan_{base_time}_{idx}_{clean_filename}"
        file_path = os.path.join(upload_dir, safe_name)
        content = await f.read()
        with open(file_path, "wb") as out:
            out.write(content)
        uploads.append({
            "url": f"/static/uploads/{safe_name}",
            "filename": f.filename,
            "index": idx + 1
        })
    return {"status": "success", "uploads": uploads, "total": len(uploads)}


@app.get("/api/patients/{patient_id}/imaging")
def get_patient_imaging_records(patient_id: str, db: Session = Depends(get_db)):
    """Fetch all imaging studies (Brain MRI, Chest X-Ray/CT, Ultrasound, etc.)."""
    records = db.query(ImagingRecord).filter(ImagingRecord.patient_id ==
                                             patient_id).order_by(ImagingRecord.created_at.desc()).all()
    return {"patient_id": patient_id, "imaging": [r.to_dict() for r in records], "total": len(records)}


@app.post("/api/patients/{patient_id}/imaging")
def add_patient_imaging_record(patient_id: str, req: ImagingRecordCreateRequest, db: Session = Depends(get_db)):
    """Add an imaging study to the patient record with single or multi-slice series."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    series_imgs = req.series_images or (
        [req.image_url] if req.image_url else [])
    img_url = req.image_url or (series_imgs[0] if series_imgs else None)

    # If image_url is a raw .dcm file, extract PNG slices
    if img_url and img_url.endswith(".dcm"):
        from services.dicom_service import is_dicom_file, process_dicom_file
        disk_path = "static" + img_url.replace("/static", "")
        if os.path.exists(disk_path) and is_dicom_file(disk_path):
            try:
                dicom_data = process_dicom_file(disk_path, "static/uploads")
                img_url = dicom_data["primary_url"]
                series_imgs = dicom_data["series_images"]
            except Exception as e:
                print(f"[DICOM Error on add_record]: {e}")

    rec = ImagingRecord(
        patient_id=patient_id,
        modality=req.modality,
        body_part=req.body_part or "brain",
        detection=req.detection,
        confidence=req.confidence or 90.0,
        measurements=req.measurements or "",
        image_url=img_url,
        series_images_json=series_imgs,
        heatmap_url=req.heatmap_url,
        bbox_json=req.bbox
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    return {"status": "success", "imaging": rec.to_dict(), "patient": build_patient_full_profile(patient, db)}

# ==============================================================================
# Legacy / Backward Compatible Case Endpoints
# ==============================================================================


@app.get("/api/cases")
async def get_patient_cases(db: Session = Depends(get_db)):
    """Retrieve list of patient cases from PostgreSQL (with fallback to default schema)."""
    patients = db.query(Patient).all()
    cases = [build_patient_full_profile(p, db) for p in patients]
    return {"cases": cases, "total": len(cases)}


@app.post("/api/cases")
async def create_patient_case(case_data: Dict[str, Any], db: Session = Depends(get_db)):
    """Create a new case in PostgreSQL."""
    req = PatientCreateRequest(
        id=case_data.get("id"),
        name=case_data.get("name", "New Patient"),
        age=case_data.get("age", 45),
        gender=case_data.get("gender", "Other"),
        chief_complaint=case_data.get("chief_complaint")
    )
    return admit_new_patient(req, db)

# ==============================================================================
# LLM Medical Insights & Clinical Copilot Endpoints
# ==============================================================================


@app.post("/api/llm/generate-report")
async def generate_llm_report(payload: Dict[str, Any]):
    """
    Generate comprehensive medical diagnostic report using free Hugging Face LLM,
    local Ollama, or local clinical engine fallback.
    """
    try:
        patient = payload.get("patient", {})
        imaging = payload.get("imaging_findings", {})
        labs = payload.get("lab_results", {})
        provider = payload.get("provider", "auto")
        model_name = payload.get("model_name")
        hf_token = payload.get("hf_token")
        ollama_url = payload.get("ollama_url")

        result = await llm_service.generate_clinical_report(
            patient=patient,
            imaging_findings=imaging,
            lab_results=labs,
            provider=provider,
            model_name=model_name,
            hf_token=hf_token,
            ollama_url=ollama_url
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/chat")
async def chat_clinical_copilot(payload: Dict[str, Any]):
    """Interactive physician clinical copilot Q&A."""
    try:
        messages = payload.get("messages", [])
        patient_context = payload.get("patient_context")
        provider = payload.get("provider", "auto")
        model_name = payload.get("model_name")
        hf_token = payload.get("hf_token")
        ollama_url = payload.get("ollama_url")

        reply = await llm_service.chat_copilot(
            messages=messages,
            patient_context=patient_context,
            provider=provider,
            model_name=model_name,
            hf_token=hf_token,
            ollama_url=ollama_url
        )
        return reply
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/test-connection")
async def test_llm_connection(payload: Dict[str, Any]):
    """Test Hugging Face token or Ollama connectivity."""
    provider = payload.get("provider", "fallback")
    hf_token = payload.get("hf_token")
    model_name = payload.get("model_name")
    ollama_url = payload.get("ollama_url")

    result = await llm_service.test_connection(
        provider=provider,
        hf_token=hf_token,
        model_name=model_name,
        ollama_url=ollama_url
    )
    return result

# ==============================================================================
# Imaging Direct Upload & Processing Endpoints
# ==============================================================================


def get_file_type(upload_file):
    filename = upload_file.filename
    if filename.endswith('.nii.gz'):
        return '.nii.gz'
    return os.path.splitext(filename)[1]


@app.post("/analyze/xray")
async def analyze_xray(file: UploadFile = File(...)):
    contents = await file.read()
    suffix = get_file_type(file)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        image = Image.open(tmp_path)
        if image.mode != "RGB":
            image = image.convert("RGB")
        image = image.resize((224, 224))
        image_np = np.array(image).astype(np.float32)
        image_tensor = torch.tensor(image_np).permute(2, 0, 1).unsqueeze(0)
        result = imaging_services["xray"].analyze(image_tensor)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {e}")


@app.post("/analyze/mri")
async def analyze_mri(file: UploadFile = File(...)):
    contents = await file.read()
    suffix = get_file_type(file)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        image = Image.open(tmp_path)
        if image.mode != "RGB":
            image = image.convert("RGB")
        image = image.resize((128, 128))
        image_np = np.array(image).astype(np.float32)
        image_tensor = torch.tensor(image_np).permute(2, 0, 1).unsqueeze(0)
        result = imaging_services["mri"].analyze(image_tensor)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {e}")


@app.post("/analyze/test-results")
async def analyze_test_results(data: Dict[str, Any]):
    try:
        result = test_service.analyze(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=511, reload=True)
