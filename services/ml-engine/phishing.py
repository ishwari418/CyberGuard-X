from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .database import get_db
from .models import PhishingLog, User
from .auth import get_current_user
import httpx
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/phishing", tags=["Phishing Guard"])

class TextAnalysisRequest(BaseModel):
    text: str

class URLScanRequest(BaseModel):
    url: str

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@router.post("/analyze/text")
async def analyze_text(request: TextAnalysisRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Real AI Analysis using Gemini
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Act as a Cybersecurity Expert. Analyze the following text for phishing, scam, or emotional manipulation indicators.
        Text: "{request.text}"
        
        Output ONLY a JSON object with these EXACT keys:
        {{
            "risk_score": <int 0-100>,
            "is_phishing": <boolean>,
            "reasons": ["reason1", "reason2"],
            "verdict": "Safe/Suspicious/Malicious"
        }}
        """
        response = model.generate_content(prompt)
        text_resp = response.text.replace("```json", "").replace("```", "").strip()
        
        import json
        try:
            data = json.loads(text_resp)
            risk_score = data.get("risk_score", 0)
            is_phishing = data.get("is_phishing", False)
            reasons = data.get("reasons", ["Analysis complete"])
        except Exception:
            # Fallback parsing
            content = response.text.lower()
            risk_score = 85 if any(word in content for word in ["phishing", "scam", "urgent", "fake"]) else 10
            is_phishing = risk_score > 50
            reasons = ["AI detected suspicious patterns"] if is_phishing else ["Content looks normal"]
        
    except Exception as e:
        print(f"Gemini Error: {e}")
        risk_score = 0
        is_phishing = False
        reasons = ["AI Analysis Service temporarily unavailable"]

    # Only log to DB if user is actually authenticated
    try:
        if current_user and hasattr(current_user, 'id'):
            log = PhishingLog(
                user_id=current_user.id,
                content=request.text[:500],
                type="TEXT",
                risk_score=risk_score,
                is_phishing=is_phishing
            )
            db.add(log)
            db.commit()
    except Exception:
        pass
    
    return {
        "risk_score": risk_score,
        "is_phishing": is_phishing,
        "reasons": reasons
    }

@router.post("/analyze/url")
async def analyze_url(request: URLScanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Real VirusTotal URL Scan
    vt_key = os.getenv("VIRUSTOTAL_API_KEY")
    url = request.url
    
    risk_score = 0
    is_phishing = False
    details = "Analyzing URL patterns..."
    reasons = []

    # 1. Try VirusTotal (The "Knownt Threats" check)
    async with httpx.AsyncClient() as client:
        try:
            import base64
            url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
            headers = {"x-apikey": vt_key}
            resp = await client.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=headers)
            
            if resp.status_code == 200:
                data = resp.json()
                stats = data["data"]["attributes"]["last_analysis_stats"]
                malicious = stats["malicious"]
                suspicious = stats["suspicious"]
                
                if malicious > 0:
                    risk_score = 100
                    is_phishing = True
                    details = f"🚨 DANGER: Blocked by {malicious} security engines."
                    reasons.append(f"Confirmed malicious by {malicious} antivirus vendors")
                elif suspicious > 0:
                    risk_score = 75
                    is_phishing = True
                    details = "⚠️ SUSPICIOUS: Flagged as potentially dangerous."
                    reasons.append(f"Flagged by {suspicious} security scanners")
            elif resp.status_code == 404:
                details = "New/Unknown URL. Running AI heuristic analysis..."
        except Exception:
            details = "Threat database offline. Using AI heuristics."

    # 2. Hybrid AI Fallback (The "Zero-Day" detection check)
    # If VT is clean or doesn't know the URL, ask Gemini for a heuristic check
    if not is_phishing or risk_score < 70:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
            Act as a Senior Cybersecurity Researcher. Analyze this URL for phishing, typosquatting, or malicious intent: "{url}"
            Look for:
            - Typosquatting (e.g., payp-al.com vs paypal.com)
            - Suspicious TLDs (.xyz, .top, .online)
            - Deep path obfuscation
            - Punycode/homoglyph attacks
            
            Output ONLY a JSON object with:
            {{
                "ai_risk": <int 0-100>,
                "is_malicious": <boolean>,
                "ai_verdict": "<Short explanation of the pattern>"
            }}
            """
            response = model.generate_content(prompt)
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            ai_data = json.loads(clean_text)
            
            # Combine scores if VT was clean but AI is worried
            if ai_data.get("is_malicious"):
                risk_score = max(risk_score, ai_data.get("ai_risk", 75))
                is_phishing = True
                details = f"🛡️ AI WARNING: {ai_data.get('ai_verdict')}"
                reasons.append(f"AI Analytics: {ai_data.get('ai_verdict')}")
            elif risk_score == 0:
                details = "No known threats detected."
                reasons.append("Clean URL signature")
                
        except Exception as e:
            print(f"URL AI Error: {e}")
            if risk_score == 0:
                details = "URL appears safe (No historical threats)"

    # Only log to DB if user is actually authenticated
    try:
        if current_user and hasattr(current_user, 'id'):
            log = PhishingLog(
                user_id=current_user.id,
                content=url,
                type="URL",
                risk_score=risk_score,
                is_phishing=is_phishing
            )
            db.add(log)
            db.commit()
    except Exception:
        pass
    
    return {
        "risk_score": risk_score,
        "is_phishing": is_phishing,
        "details": details,
        "reasons": reasons
    }
