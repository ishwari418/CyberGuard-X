from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Guardian Shield API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config ---
VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
SB_API_KEY = os.getenv("SAFE_BROWSING_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyAXk9rw8otEWVJw_MmyDxLGGh5WxGj9Q9Q"

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# --- Models ---
class ScanRequest(BaseModel):
    url: str

class TextScanRequest(BaseModel):
    text: str

# --- Routes ---

@app.get("/api/health")
def health():
    return {"status": "online", "system": "Guardian Shield Core"}

# --- Database Init ---
# --- Database Init ---
from .database import engine, Base
from . import models # Import models to register them with Base
Base.metadata.create_all(bind=engine)

# --- Routers ---
# --- Routers ---
from .auth import router as auth_router
from .cyber_assist import router as cyber_router
from .phishing import router as phishing_router
from .app_sentinel import router as app_router
from .voice import router as voice_router
from .qr import router as qr_router
from .vault import router as vault_router

app.include_router(auth_router)
app.include_router(cyber_router)
app.include_router(phishing_router)
app.include_router(app_router)
app.include_router(voice_router)
app.include_router(qr_router)
app.include_router(vault_router)


@app.post("/api/scan/phishing")
async def scan_phishing(request: ScanRequest):
    url = request.url
    results = {
        "safe": True,
        "risk_score": 0,
        "sources": {},
        "analysis": "Analysis complete."
    }

    # 1. Google Safe Browsing
    sb_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={SB_API_KEY}"
    payload = {
        "client": {"clientId": "guardian-shield", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(sb_url, json=payload)
            data = resp.json()
            if "matches" in data:
                results["safe"] = False
                results["risk_score"] = 100
                results["sources"]["google_safe_browsing"] = "MALICIOUS"
                results["analysis"] = "⚠️ FLAGGED by Google Safe Browsing as a known threat."
                return results
    except Exception as e:
        print(f"GSB Error: {e}")

    # 2. Gemini AI Analysis
    try:
        prompt = f"""
        Act as a Cybersecurity Expert. Analyze this URL: "{url}"
        
        Check for:
        - Typosquatting (e.g. g0ogle.com)
        - Suspicious TLDs (.xyz, .top)
        - Obfuscation
        
        Output ONLY a JSON object:
        {{
            "risk_score": <number 0-100>,
            "verdict": "<Safe/Suspicious/Malicious>",
            "reason": "<Short explanation>"
        }}
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean up code blocks if Gemini adds them
        if text.startswith("```"):
            if "json" in text:
                 text = text.split("\n", 1)[1].rsplit("\n", 1)[0]
            else:
                 text = text.strip("`")

        import json
        try:
            ai_data = json.loads(text)
        except json.JSONDecodeError:
             ai_data = {"risk_score": 0, "reason": "AI analysis returned invalid format.", "verdict": "Unknown"}

        
        results["sources"]["gemini_ai"] = ai_data
        results["risk_score"] = ai_data.get("risk_score", 0)
        
        if ai_data.get("risk_score") > 50:
            results["safe"] = False
            results["analysis"] = f"⚠️ AI Warning: {ai_data.get('reason')}"
        else:
            results["analysis"] = f"✅ AI Verdict: {ai_data.get('reason')}"

    except Exception as e:
        print(f"Gemini Error: {e}")
        results["analysis"] = "AI Analysis failed. URL pattern looks neutral."

    return results

@app.post("/api/scan/text")
async def scan_text(request: TextScanRequest):
    text = request.text
    try:
        prompt = f"""
        Analyze this message for scam intent: "{text}"
        
        Output ONLY a JSON object:
        {{
            "is_scam": <true/false>,
            "confidence": <number 0-100>,
            "type": "<Phishing/Financial/Safe/Spam>",
            "explanation": "<Short explanation>"
        }}
        """
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        import json
        data = json.loads(cleaned_text)
        return data
    except Exception as e:
        return {"is_scam": False, "explanation": f"Error analyzing text: {str(e)}"}

class ChatRequest(BaseModel):
    message: str
    history: list = []

# Load Knowledge Base
import json
try:
    with open("services/ml-engine/knowledge_base.json", "r") as f:
        KNOWLEDGE_BASE = json.load(f)
except Exception:
    KNOWLEDGE_BASE = {}

@app.post("/api/chat")
async def chat_bot(request: ChatRequest):
    try:
        user_msg = request.message.lower()
        reply = "I am Guardian Bot, your offline assistant. Ask me about Phishing, App Scan, or Safety."

        # 1. Check Features
        found_feature = False
        if KNOWLEDGE_BASE and "features" in KNOWLEDGE_BASE:
            for feat_name, feat_data in KNOWLEDGE_BASE["features"].items():
                # Simple keyword match: check if feature name words are in user message
                keywords = feat_name.lower().split()
                if any(k in user_msg for k in keywords):
                    reply = f"**{feat_name}**\n\n{feat_data['description']}\n\n*How to use:* {feat_data['how_to_use']}"
                    found_feature = True
                    break
        
        if found_feature:
            return {"reply": reply}

        # 2. Check Emergency
        if "emergency" in user_msg or "police" in user_msg or "help" in user_msg:
             contacts = [f"{k}: {v}" for k,v in KNOWLEDGE_BASE.get("emergency_contacts", {}).items()]
             reply = "**EMERGENCY CONTACTS**\n\n" + "\n".join(contacts)
             return {"reply": reply}

        # 3. General Advice (OTP, Bank, etc)
        if "otp" in user_msg or "bank" in user_msg or "password" in user_msg:
            tips = KNOWLEDGE_BASE.get("general_advice", [])
            reply = "**Safety Tip:**\n" + tips[0] if tips else "Stay Safe."
            return {"reply": reply}
            
        # 4. Fallback
        return {"reply": "I can help you with: Phishing Guard, Cyber Assist, App Sentinel, Voice Shield, or Emergency contacts. What do you need?"}

    except Exception as e:
        return {"reply": f"System Error: {str(e)}"}

@app.post("/api/scan/file_hash")
async def scan_file_hash(request: dict = Body(...)):
    # Real VirusTotal Hash Check
    file_hash = request.get("hash")
    if not file_hash:
        return {"error": "No hash provided"}
        
    url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
    headers = {"x-apikey": VT_API_KEY}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            stats = data["data"]["attributes"]["last_analysis_stats"]
            malicious = stats["malicious"]
            return {
                "malicious_count": malicious,
                "safe": malicious == 0,
                "verdict": "Malicious" if malicious > 0 else "Safe"
            }
        elif resp.status_code == 404:
            return {"safe": True, "verdict": "Unknown File (Not in Database)"}
        else:
            return {"error": "VT API Error"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
