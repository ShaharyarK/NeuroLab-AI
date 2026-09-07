from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
from services.database import Base
from datetime import datetime

# Association Table for Multi-Doctor Collaboration
patient_consultants = Table(
    "patient_consultants",
    Base.metadata,
    Column("patient_id", String, ForeignKey("patients.id"), primary_key=True),
    Column("doctor_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("assigned_at", DateTime, default=datetime.utcnow)
)

class PatientRelationship(Base):
    __tablename__ = "patient_relationships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    related_patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    relationship_type = Column(String, nullable=False)  # "Mother", "Child", "Father", "Spouse", "Sibling", "Son", "Daughter", "Guardian", "Relative"
    notes = Column(Text, nullable=True)  # e.g., "Pediatric dependent in Ward 3B", "Hereditary risk sharing"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    related_patient = relationship("Patient", foreign_keys=[related_patient_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "related_patient_id": self.related_patient_id,
            "relationship_type": self.relationship_type,
            "notes": self.notes or "",
            "related_patient": {
                "id": self.related_patient.id,
                "name": self.related_patient.name,
                "age": self.related_patient.age,
                "gender": self.related_patient.gender,
                "blood_group": self.related_patient.blood_group,
                "status": self.related_patient.case_status,
                "allergies": self.related_patient.allergies
            } if self.related_patient else None
        }

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True)  # e.g. "NL0194"
    mrn = Column(String, unique=True, index=True, nullable=True)  # Medical Record Number
    name = Column(String, index=True, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)  # "Female", "Male", "Other"
    blood_group = Column(String, default="O+")
    contact_number = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    allergies = Column(String, default="No known drug allergies (NKDA)")
    chief_complaint = Column(Text, nullable=True)
    case_status = Column(String, default="REVIEWING")  # "REVIEWING", "TRIAGE", "CRITICAL", "DISCHARGED"
    admission_date = Column(String, default=lambda: datetime.now().strftime("%Y-%m-%d"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Attending Physician (Primary Lead)
    attending_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    attending_doctor = relationship("User", foreign_keys=[attending_doctor_id])

    # Consulting Doctors (Multi-Doctor Collaboration Team)
    consulting_doctors = relationship(
        "User",
        secondary=patient_consultants,
        backref="consulted_patients"
    )

    # Family Members / Lineage Links
    family_links = relationship(
        "PatientRelationship",
        foreign_keys=[PatientRelationship.patient_id],
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def to_dict(self):
        family_data = []
        try:
            for rel in self.family_links:
                family_data.append(rel.to_dict())
        except Exception:
            pass

        return {
            "id": self.id,
            "mrn": self.mrn or f"MRN-{self.id}",
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "blood_group": self.blood_group,
            "contact_number": self.contact_number or "N/A",
            "emergency_contact": self.emergency_contact or "N/A",
            "allergies": self.allergies,
            "chief_complaint": self.chief_complaint or "Routine diagnostic workup",
            "case_status": self.case_status,
            "status": self.case_status,  # alias for UI
            "admission_date": self.admission_date,
            "attending_doctor": self.attending_doctor.to_dict() if self.attending_doctor else {
                "id": 1,
                "full_name": "Dr. A. Chen, MD",
                "specialty": "Neuro-Radiology & Oncology",
                "role": "lead_physician"
            },
            "consulting_doctors": [d.to_dict() for d in self.consulting_doctors] if self.consulting_doctors else [],
            "family_members": family_data
        }
