from sqlalchemy.orm import Session
from models.user import User
from models.patient import Patient, PatientRelationship
from models.diagnostic import ImagingRecord, LabRecord, EarlyDetectionRecord
from services.early_detection_service import early_detection_service

def seed_database(db: Session):
    """Seed initial clinical staff, multi-generation family patients, and diagnostic records."""
    # 1. Seed Doctors if not present
    if db.query(User).count() == 0:
        doctors = [
            User(
                username="dr_chen",
                email="chen@neurolab.ai",
                hashed_password=User.get_password_hash("doctor123"),
                full_name="Dr. A. Chen, MD",
                license_number="MD-89210",
                specialty="Neuro-Radiology & Oncology",
                hospital_affiliation="St. Jude Neuro-Diagnostics Center",
                role="lead_physician"
            ),
            User(
                username="dr_patel",
                email="patel@neurolab.ai",
                hashed_password=User.get_password_hash("doctor123"),
                full_name="Dr. Sarah Patel, MD",
                license_number="MD-65412",
                specialty="Thoracic Oncology & Pulmonology",
                hospital_affiliation="Metro General Hospital",
                role="consultant"
            ),
            User(
                username="dr_vance",
                email="vance@neurolab.ai",
                hashed_password=User.get_password_hash("doctor123"),
                full_name="Dr. Marcus Vance, MD",
                license_number="MD-33109",
                specialty="Molecular Pathology & Hematology",
                hospital_affiliation="NeuroLab Diagnostic Institute",
                role="consultant"
            ),
            User(
                username="dr_lin",
                email="lin@neurolab.ai",
                hashed_password=User.get_password_hash("doctor123"),
                full_name="Dr. Jennifer Lin, MD",
                license_number="MD-77241",
                specialty="Pediatric Neurology & Genetics",
                hospital_affiliation="Children's Health Pavilion",
                role="consultant"
            ),
        ]
        db.add_all(doctors)
        db.commit()
        print("[Database] Seeded 4 clinical physician accounts.")

    # Retrieve doctor references
    dr_chen = db.query(User).filter(User.username == "dr_chen").first()
    dr_patel = db.query(User).filter(User.username == "dr_patel").first()
    dr_vance = db.query(User).filter(User.username == "dr_vance").first()
    dr_lin = db.query(User).filter(User.username == "dr_lin").first()

    # 2. Seed Family Hierarchy Patients
    if db.query(Patient).count() == 0:
        # Mother: Sarah Johnson
        p1 = Patient(
            id="NL0194",
            mrn="MRN-849201",
            name="Sarah Johnson",
            age=63,
            gender="Female",
            blood_group="A+",
            contact_number="+1 (555) 234-5678",
            emergency_contact="Emma Johnson (Daughter, +1 555 987-6543)",
            allergies="Penicillin, Sulfa drugs",
            chief_complaint="Persistent temporal headache, visual field aura, memory lapse",
            case_status="REVIEWING",
            admission_date="2024-08-10",
            attending_doctor_id=dr_chen.id if dr_chen else 1
        )
        if dr_patel:
            p1.consulting_doctors.append(dr_patel)
        if dr_vance:
            p1.consulting_doctors.append(dr_vance)

        # Daughter (Child): Emma Johnson
        p2 = Patient(
            id="NL0195",
            mrn="MRN-849202",
            name="Emma Johnson",
            age=28,
            gender="Female",
            blood_group="A+",
            contact_number="+1 (555) 987-6543",
            emergency_contact="Sarah Johnson (Mother, +1 555 234-5678)",
            allergies="No known drug allergies (NKDA)",
            chief_complaint="Prophylactic neuro-screening following maternal glioblastoma diagnosis; recurrent episodic migraines",
            case_status="REVIEWING",
            admission_date="2024-08-11",
            attending_doctor_id=dr_lin.id if dr_lin else 1
        )
        if dr_chen:
            p2.consulting_doctors.append(dr_chen)

        # Grandchild (Son of Emma): Leo Johnson
        p3 = Patient(
            id="NL0196",
            mrn="MRN-849203",
            name="Leo Johnson",
            age=6,
            gender="Male",
            blood_group="O+",
            contact_number="+1 (555) 987-6543",
            emergency_contact="Emma Johnson (Mother, +1 555 987-6543)",
            allergies="Peanuts (Mild)",
            chief_complaint="Pediatric genetic baseline and pediatric routine checkup",
            case_status="DISCHARGED",
            admission_date="2024-08-11",
            attending_doctor_id=dr_lin.id if dr_lin else 1
        )

        # Unrelated Patient 4: David Miller
        p4 = Patient(
            id="NL0208",
            mrn="MRN-912044",
            name="David Miller",
            age=54,
            gender="Male",
            blood_group="O+",
            contact_number="+1 (555) 443-1290",
            emergency_contact="Linda Miller (Spouse, +1 555 443-1291)",
            allergies="Aspirin",
            chief_complaint="Productive cough, fever 38.8C, dyspnea on exertion",
            case_status="TRIAGE",
            admission_date="2024-08-11",
            attending_doctor_id=dr_patel.id if dr_patel else 1
        )

        db.add_all([p1, p2, p3, p4])
        db.commit()
        print("[Database] Seeded 4 initial patients.")

        # 3. Create Bidirectional Family Relationships (Sarah <-> Emma <-> Leo)
        rel1 = PatientRelationship(
            patient_id="NL0194",
            related_patient_id="NL0195",
            relationship_type="Child (Daughter)",
            notes="First-degree offspring. Family neuro-oncology risk protocol initiated."
        )
        rel2 = PatientRelationship(
            patient_id="NL0195",
            related_patient_id="NL0194",
            relationship_type="Mother",
            notes="Biological mother with temporal lobe neoplasm."
        )
        rel3 = PatientRelationship(
            patient_id="NL0194",
            related_patient_id="NL0196",
            relationship_type="Grandchild",
            notes="Maternal grandson."
        )
        rel4 = PatientRelationship(
            patient_id="NL0195",
            related_patient_id="NL0196",
            relationship_type="Child (Son)",
            notes="Pediatric dependent."
        )
        rel5 = PatientRelationship(
            patient_id="NL0196",
            related_patient_id="NL0195",
            relationship_type="Mother",
            notes="Primary legal guardian and biological mother."
        )
        db.add_all([rel1, rel2, rel3, rel4, rel5])
        db.commit()
        print("[Database] Seeded family relationship hierarchy links.")

    # 4. Seed Diagnostic Records if missing
    if db.query(ImagingRecord).count() == 0:
        sarah_early = early_detection_service.analyze_patient_early_risks(
            patient={"id": "NL0194", "age": 63, "gender": "Female"},
            labs={
                "cbc": {
                    "Hemoglobin": {"value": 12.1, "unit": "g/dL", "status": "normal"},
                    "WBC": {"value": 8.9, "unit": "K/mcL", "status": "normal"},
                    "Platelets": {"value": 210, "unit": "K/mcL", "status": "normal"}
                },
                "biomarkers": {
                    "CRP": {"value": 32, "unit": "mg/L", "status": "high", "ref": "< 5.0"},
                    "Ferritin": {"value": 450, "unit": "ng/mL", "status": "high", "ref": "15-150"},
                    "LDH": {"value": 245, "unit": "U/L", "status": "high", "ref": "140-220"}
                }
            },
            imaging={
                "mri": {
                    "detection": "Detection - Glioblastoma Multiforme",
                    "malignancy_risk": 94.7,
                    "edema": "Marked vasogenic edema with 2.4mm midline shift"
                },
                "cxr": {
                    "detection": "Pulmonary Nodules (Right Lung Apex, 14mm)",
                    "segmentation_score": 88.1,
                    "pneumonia_score": 12.3
                }
            }
        )

        rec_early = EarlyDetectionRecord(
            patient_id="NL0194",
            oncology_risk=sarah_early["oncology"]["score"],
            cardiovascular_risk=sarah_early["cardiovascular"]["score"],
            metabolic_risk=sarah_early["metabolic"]["score"],
            renal_stress_risk=sarah_early["renal"]["score"],
            hepatic_stress_risk=sarah_early["hepatic"]["score"],
            summary_flags=sarah_early["flags"],
            action_plan=sarah_early["action_plan"]
        )

        rec_lab_cbc = LabRecord(
            patient_id="NL0194",
            category="cbc",
            metrics_json={
                "Hemoglobin": {"value": 12.1, "unit": "g/dL", "status": "normal"},
                "WBC": {"value": 8.9, "unit": "K/mcL", "status": "normal"},
                "Platelets": {"value": 210, "unit": "K/mcL", "status": "normal"},
                "RBC": {"value": 4.2, "unit": "M/mcL", "status": "normal"},
                "Hematocrit": {"value": 37.5, "unit": "%", "status": "normal"}
            },
            abnormal_flags_json=[]
        )

        rec_lab_bio = LabRecord(
            patient_id="NL0194",
            category="biomarkers",
            metrics_json={
                "CRP": {"value": 32, "unit": "mg/L", "status": "high", "ref": "< 5.0"},
                "Ferritin": {"value": 450, "unit": "ng/mL", "status": "high", "ref": "15-150"},
                "LDH": {"value": 245, "unit": "U/L", "status": "high", "ref": "140-220"},
                "CEA": {"value": 4.8, "unit": "ng/mL", "status": "elevated", "ref": "< 3.0"}
            },
            abnormal_flags_json=["Elevated CRP (Systemic Inflammation)", "Elevated Ferritin (Acute phase reactant)", "Mild LDH elevation"]
        )

        rec_img_mri = ImagingRecord(
            patient_id="NL0194",
            modality="mri",
            body_part="brain",
            detection="Detection - Glioblastoma Multiforme (Left Temporal Lobe)",
            confidence=94.7,
            measurements="32mm x 28mm lesion with 2.4mm midline shift and marked vasogenic edema",
            image_url="/static/mri_preview.png"
        )

        rec_img_cxr = ImagingRecord(
            patient_id="NL0194",
            modality="cxr",
            body_part="chest",
            detection="Pulmonary Nodule (Right Lung Apex, 14mm)",
            confidence=88.1,
            measurements="14mm spiculated ground-glass opacity nodule",
            image_url="/static/cxr_preview.png"
        )

        # David Miller Pneumonia CXR study
        rec_david_cxr = ImagingRecord(
            patient_id="NL0208",
            modality="cxr",
            body_part="chest",
            detection="Right Lower Lobe Consolidation (Pneumonia)",
            confidence=86.4,
            measurements="Dense alveolar consolidation in right base with air bronchograms",
            image_url="/static/cxr_preview.png"
        )

        db.add_all([rec_early, rec_lab_cbc, rec_lab_bio, rec_img_mri, rec_img_cxr, rec_david_cxr])
        db.commit()
        print("[Database] Seeded diagnostics and early detection records for Sarah Johnson & David Miller.")
