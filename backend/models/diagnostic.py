from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from services.database import Base
from datetime import datetime

class ImagingRecord(Base):
    __tablename__ = "imaging_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    modality = Column(String, nullable=False)  # "mri", "cxr", "ct", "ultrasound", "bone_xray"
    body_part = Column(String, default="brain")  # "brain", "chest", "abdomen", "spine", "extremities"
    detection = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    measurements = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    heatmap_url = Column(String, nullable=True)
    bbox_json = Column(JSON, nullable=True)
    series_images_json = Column(JSON, nullable=True)  # List of image URLs for multi-slice/multi-view studies
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", backref="imaging_records")

    def to_dict(self):
        imgs = self.series_images_json or ([self.image_url] if self.image_url else [])
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "modality": self.modality,
            "body_part": self.body_part,
            "detection": self.detection,
            "confidence": self.confidence,
            "measurements": self.measurements,
            "image_url": self.image_url or (imgs[0] if imgs else None),
            "series_images": imgs,
            "total_images": len(imgs),
            "heatmap_url": self.heatmap_url,
            "bbox": self.bbox_json,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class LabRecord(Base):
    __tablename__ = "lab_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    category = Column(String, nullable=False)  # "cbc", "biomarkers", "lft", "kft", "lipid", "endocrine", "urinalysis"
    test_date = Column(String, default=lambda: datetime.now().strftime("%Y-%m-%d"))
    metrics_json = Column(JSON, nullable=False)
    abnormal_flags_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", backref="lab_records")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "category": self.category,
            "test_date": self.test_date,
            "metrics": self.metrics_json,
            "abnormal_flags": self.abnormal_flags_json or [],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class EarlyDetectionRecord(Base):
    __tablename__ = "early_detection_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    oncology_risk = Column(Float, default=0.0)
    cardiovascular_risk = Column(Float, default=0.0)
    metabolic_risk = Column(Float, default=0.0)
    renal_stress_risk = Column(Float, default=0.0)
    hepatic_stress_risk = Column(Float, default=0.0)
    summary_flags = Column(JSON, nullable=True)
    action_plan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", backref="early_detection_records")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "oncology_risk": self.oncology_risk,
            "cardiovascular_risk": self.cardiovascular_risk,
            "metabolic_risk": self.metabolic_risk,
            "renal_stress_risk": self.renal_stress_risk,
            "hepatic_stress_risk": self.hepatic_stress_risk,
            "summary_flags": self.summary_flags or [],
            "action_plan": self.action_plan,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
