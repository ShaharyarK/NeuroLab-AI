from sqlalchemy import Column, Integer, String, Boolean
from services.database import Base
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True, default="Dr. A. Chen, MD")
    license_number = Column(String, nullable=True, default="MD-89210")
    specialty = Column(String, nullable=True, default="Neuro-Radiology & Oncology")
    hospital_affiliation = Column(String, nullable=True, default="St. Jude Neuro-Diagnostics Center")
    role = Column(String, default="lead_physician")  # lead_physician, consultant, radiologist, pathologist
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str) -> bool:
        return pwd_context.verify(plain_password, self.hashed_password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name or self.username,
            "license_number": self.license_number or "MD-REG",
            "specialty": self.specialty or "General Medicine",
            "hospital_affiliation": self.hospital_affiliation or "NeuroLab Medical Center",
            "role": self.role or "lead_physician",
            "is_active": self.is_active,
            "is_admin": self.is_admin
        }