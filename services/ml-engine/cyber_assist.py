from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from .database import get_db
from .models import Incident, Evidence, User
from .auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import random

router = APIRouter(prefix="/api", tags=["Cyber Assist"])

# Schemas
class IncidentCreate(BaseModel):
    category: str
    summary: str

class IncidentResponse(BaseModel):
    id: int
    category: str
    summary: str
    status: str
    created_at: str
    
    class Config:
        from_attributes = True

class RiskAnalysisRequest(BaseModel):
    message: str
    sender: Optional[str] = None

# Routes
@router.post("/incidents", response_model=IncidentResponse)
def create_incident(incident: IncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_incident = Incident(
        user_id=current_user.id,
        category=incident.category,
        summary=incident.summary
    )
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident

@router.get("/incidents", response_model=List[IncidentResponse])
def get_incidents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Incident).filter(Incident.user_id == current_user.id).all()

@router.post("/evidence/upload")
async def upload_evidence(incident_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify incident belongs to user
    incident = db.query(Incident).filter(Incident.id == incident_id, Incident.user_id == current_user.id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_evidence = Evidence(
        incident_id=incident_id,
        file_path=file_path,
        file_type=file.content_type
    )
    db.add(new_evidence)
    db.commit()
    
    return {"message": "Evidence uploaded successfully", "file_path": file_path}

@router.post("/analyze/risk")
def analyze_risk(request: RiskAnalysisRequest):
    # Mock AI Logic
    score = random.randint(0, 100)
    reasons = []
    
    keywords = ["urgent", "bank", "otp", "verify", "account blocked"]
    if any(k in request.message.lower() for k in keywords):
        score += 30
        reasons.append("Contains urgency or banking keywords.")
    
    if request.sender and len(request.sender) < 10: # Shortcode
        reasons.append("Sender appears to be a shortcode/bulk sender.")
        
    score = min(score, 100)
    
    verdict = "Safe"
    if score > 70:
        verdict = "High Risk"
    elif score > 40:
        verdict = "Suspicious"
        
    return {
        "risk_score": score,
        "verdict": verdict,
        "reasons": reasons,
        "suggested_action": "Block sender and do not click links." if score > 40 else "No action needed."
    }

@router.post("/generate/report")
def generate_report(incident_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incident = db.query(Incident).filter(Incident.id == incident_id, Incident.user_id == current_user.id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    # Mock PDF Generation
    return {
        "message": "Report generated successfully",
        "download_url": f"/api/reports/{incident_id}.pdf" # Mock URL
    }
