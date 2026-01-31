from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import AppScan, User
from .auth import get_current_user
import hashlib
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/app-sentinel", tags=["App Sentinel"])

VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")

@router.post("/scan-file")
async def scan_file(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Calculate SHA-256 Hash of the file
    sha256_hash = hashlib.sha256()
    content = await file.read()
    sha256_hash.update(content)
    file_hash = sha256_hash.hexdigest()
    
    # 2. Query VirusTotal API
    url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
    headers = {"x-apikey": VT_API_KEY}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            attributes = data["data"]["attributes"]
            stats = attributes["last_analysis_stats"]
            malicious = stats["malicious"]
            
            risk_level = "HIGH" if malicious > 0 else "SAFE"
            
            # Save to DB
            scan_record = AppScan(
                user_id=current_user.id,
                app_name=file.filename,
                package_name="N/A (File Scan)",
                risk_level=risk_level,
                permissions=f"Malicious: {malicious}/{sum(stats.values())}"
            )
            db.add(scan_record)
            db.commit()
            
            return {
                "filename": file.filename,
                "risk_level": risk_level,
                "malicious_count": malicious,
                "total_scanners": sum(stats.values()),
                "verdict": "Malicious" if malicious > 0 else "Safe",
                "details": attributes.get("meaningful_name", "Unknown File")
            }
            
        elif resp.status_code == 404:
            return {
                "filename": file.filename,
                "risk_level": "UNKNOWN",
                "verdict": "Unknown File",
                "details": "File not found in VirusTotal database. It might be a new file."
            }
        else:
            raise HTTPException(status_code=400, detail=f"VirusTotal Error: {resp.status_code}")

