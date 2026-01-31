from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .database import get_db
from .models import CallLog, User
from .auth import get_current_user
from .auth import get_current_user
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/voice", tags=["Voice Shield"])

class NumberCheckRequest(BaseModel):
    phone_number: str

@router.post("/check-number")
async def check_number(request: NumberCheckRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Real NumVerify API Check
    api_key = os.getenv("NUMVERIFY_API_KEY")
    # Add country_code=IN as default for local numbers
    url = f"http://apilayer.net/api/validate?access_key={api_key}&number={request.phone_number}&country_code=IN"
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url)
            data = resp.json()
        except Exception:
            data = {"valid": False}
    
    # Analyze API Response
    valid = data.get("valid", False)
    carrier = data.get("carrier", "Unknown Carrier")
    location = data.get("location", "Unknown Location")
    line_type = data.get("line_type", "Unknown")
    
    # Simple Risk Logic
    risk_score = 0
    is_spam = False
    
    if not valid:
        risk_score = 50 
        caller_name = "Unknown/Invalid Number"
    elif line_type == "voip":
        risk_score = 40
        caller_name = f"VoIP Caller ({location})"
    else:
        caller_name = f"{carrier} ({location})"
    
    # Only log to DB if user is actually authenticated
    # Using a try-except to handle cases where current_user might be an error or None
    try:
        if current_user and hasattr(current_user, 'id'):
            log = CallLog(
                user_id=current_user.id,
                phone_number=request.phone_number,
                caller_name=caller_name,
                risk_score=risk_score,
                is_spam=is_spam
            )
            db.add(log)
            db.commit()
    except Exception:
        pass
    
    return {
        "phone_number": request.phone_number,
        "risk_score": risk_score,
        "is_spam": is_spam,
        "caller_name": caller_name,
        "location": location,
        "carrier": carrier,
        "line_type": line_type,
        "reports": "N/A (Real-time Carrier Check)",
        "details": f"Carrier: {carrier}, Type: {line_type}, Location: {location}"
    }

@router.get("/logs")
def get_call_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(CallLog).filter(CallLog.user_id == current_user.id).order_by(CallLog.created_at.desc()).limit(10).all()
    return logs
