from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import QRScan, User
from .auth import get_current_user
import cv2
import numpy as np
from pyzbar.pyzbar import decode
from PIL import Image
import io

router = APIRouter(prefix="/qr", tags=["QR Analyzer"])

@router.post("/decode")
async def decode_qr(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Real QR Decoding
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        decoded_objects = decode(img)
        
        if not decoded_objects:
            return {"error": "No QR code found in image"}
            
        # Get first QR code
        obj = decoded_objects[0]
        qr_data = obj.data.decode("utf-8")
        qr_type = obj.type
        
        # Simple safety check (mock for now, or reuse VT logic if we import it)
        is_safe = not ("malware" in qr_data or "virus" in qr_data)
        
        log = QRScan(
            user_id=current_user.id,
            content=qr_data,
            is_safe=is_safe
        )
        db.add(log)
        db.commit()
        
        return {
            "content": qr_data,
            "type": qr_type,
            "is_safe": is_safe,
            "risk_score": 0 if is_safe else 100,
            "details": "Decoded successfully"
        }
        
    except Exception as e:
        print(f"QR Error: {e}")
        raise HTTPException(status_code=400, detail="Failed to decode QR code")

