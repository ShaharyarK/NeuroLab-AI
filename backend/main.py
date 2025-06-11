from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import torch
import monai
from PIL import Image
import io
import numpy as np
from services.imaging_service import ImagingAnalysisService
from services.test_analysis_service import TestAnalysisService
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="NeuroLab AI Backend")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize services
imaging_services = {
    "xray": ImagingAnalysisService("xray"),
    "mri": ImagingAnalysisService("mri"),
    "ct": ImagingAnalysisService("ct")
}
test_service = TestAnalysisService()

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AnalysisResult(BaseModel):
    result: str
    confidence: float
    timestamp: datetime

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception

# Routes
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # TODO: Implement proper user authentication
    # For now, using a simple hardcoded check
    if form_data.username == "admin" and form_data.password == "admin":
        access_token = create_access_token(data={"sub": form_data.username})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Incorrect username or password")

@app.post("/analyze/xray")
async def analyze_xray(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = imaging_services["xray"].analyze(image)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze/mri")
async def analyze_mri(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = imaging_services["mri"].analyze(image)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze/ct")
async def analyze_ct(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = imaging_services["ct"].analyze(image)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze/test-results")
async def analyze_test_results(
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    try:
        result = test_service.analyze(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=511, reload=True) 