import { Request, Response } from 'express';

// --- MOCK DATA ---
const mockCallLogs = [
    { id: 1, phone_number: '+91 98765 43210', caller_name: 'Unknown Service', is_spam: true, created_at: new Date() },
    { id: 2, phone_number: '+1 555 0123', caller_name: 'Alice', is_spam: false, created_at: new Date() }
];

const mockVaultItems = [
    { id: '1', title: 'Gmail Password', type: 'PASSWORD', created_at: new Date() },
    { id: '2', title: 'Secret Note', type: 'NOTE', created_at: new Date() }
];

const mockIncidents = [
    { id: 1, category: 'Phishing', summary: 'Suspicious email from bank', status: 'Pending', created_at: new Date() }
];

// --- PHISHING ---
export const checkPhishing = async (req: Request, res: Response) => {
    const { text } = req.body;

    // 1. Try forwarding to Python ML Engine (Port 5000) for REAL AI analysis
    try {
        const response = await fetch('http://127.0.0.1:5000/phishing/analyze/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        }
    } catch (error) {
        console.warn("Python ML Service offline, using Mock Data for Phishing Guard");
    }

    // 2. Fallback Mock Logic
    const isPhishing = text.toLowerCase().includes('urgent') ||
        text.toLowerCase().includes('password') ||
        text.toLowerCase().includes('otp');
    res.json({
        is_phishing: isPhishing,
        risk_score: isPhishing ? 85 : 10,
        reasons: isPhishing ? ['Contains urgent language', 'Requests sensitive info'] : ['Text appears normal']
    });
};

export const analyzeUrl = async (req: Request, res: Response) => {
    const { url } = req.body;

    // 1. Try forwarding to Python ML Engine (Port 5000) for real VirusTotal scan
    try {
        const response = await fetch('http://127.0.0.1:5000/phishing/analyze/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        }
    } catch (error) {
        console.warn("Python ML Service offline, using Mock Data for URL analysis");
    }

    // 2. Fallback Mock Logic
    const isMalicious = url.includes('malware') || url.includes('login-verify') || url.includes('.xyz');
    res.json({
        is_phishing: isMalicious,
        risk_score: isMalicious ? 90 : 5,
        details: isMalicious ? 'Known malicious pattern detected' : 'Link appears safe'
    });
};

// --- QR ---
export const analyzeQr = async (req: Request, res: Response) => {
    // In a real app, this would use multer to process the file
    res.json({
        content: 'https://example.com/promo',
        is_safe: true,
        details: 'Verified safe URL'
    });
};

// --- VOICE ---
export const checkPhoneNumber = async (req: Request, res: Response) => {
    const { phone_number } = req.body;

    // 1. Try forwarding to Python ML Engine (Port 5000) for REAL data
    try {
        // Use 127.0.0.1 for direct local connection
        const response = await fetch('http://127.0.0.1:5000/voice/check-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number })
        });

        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        }
    } catch (error) {
        console.warn("Python ML Service offline, using Smart Mock for Voice Shield");
    }

    // 2. Smart Fallback Mock Logic
    let cleanNumber = phone_number.replace(/\D/g, '');
    if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

    let location = 'International';
    let carrier = 'Global Telecom';
    let risk_score = 10;
    let is_spam = false;

    if (cleanNumber.startsWith('91')) {
        // Mock State Mapping for India
        const prefix = cleanNumber.substring(2, 4);
        const stateMap: { [key: string]: { state: string, carrier: string } } = {
            '98': { state: 'Maharashtra', carrier: 'Airtel' },
            '99': { state: 'Karnataka', carrier: 'Vodafone Idea' },
            '88': { state: 'Delhi', carrier: 'Jio Reliance' },
            '77': { state: 'Gujarat', carrier: 'BSNL' },
            '91': { state: 'Tamil Nadu', carrier: 'Airtel' }
        };
        const info = stateMap[prefix] || { state: 'Maharashtra, India', carrier: 'Jio Reliance' };
        location = info.state;
        carrier = info.carrier;
    } else if (cleanNumber.startsWith('1')) {
        location = 'California, USA';
        carrier = 'AT&T';
    }

    // Custom "Spam" trigger for testing
    if (phone_number.includes('000') || phone_number.endsWith('00')) {
        is_spam = true;
        risk_score = 85;
    }

    res.json({
        phone_number: phone_number,
        caller_name: is_spam ? 'Potential Spam' : `Verified Caller (${carrier})`,
        is_spam: is_spam,
        risk_score: risk_score,
        location: location,
        carrier: carrier,
        line_type: 'Mobile',
        details: `Carrier: ${carrier}, Type: Mobile, Location: ${location}`
    });
};

export const getCallLogs = async (req: Request, res: Response) => {
    res.json(mockCallLogs);
};

// --- APP SENTINEL ---
export const scanFile = async (req: Request, res: Response) => {
    // Mock VirusTotal Scan
    res.json({
        filename: 'uploaded_app.apk',
        malicious_count: 0,
        total_scanners: 60,
        verdict: 'safe',
        details: 'No threats detected by 60 engines.'
    });
};

// --- VAULT ---
export const getVaultItems = async (req: Request, res: Response) => {
    res.json(mockVaultItems);
};

export const addToVault = async (req: Request, res: Response) => {
    const { title, type } = req.body;
    mockVaultItems.push({ id: Date.now().toString(), title, type, created_at: new Date() });
    res.json({ success: true });
};

export const deleteVaultItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const index = mockVaultItems.findIndex(i => i.id === id);
    if (index > -1) mockVaultItems.splice(index, 1);
    res.json({ success: true });
};

// --- INCIDENTS ---
export const getIncidents = async (req: Request, res: Response) => {
    res.json(mockIncidents);
};

export const reportIncident = async (req: Request, res: Response) => {
    const { category, summary } = req.body;
    mockIncidents.unshift({ id: Date.now(), category, summary, status: 'Received', created_at: new Date() });
    res.json({ success: true });
};

// --- CHAT ---
export const chatWithAI = async (req: Request, res: Response) => {
    const { message } = req.body;
    res.json({ reply: `[Mock AI] I received your message: "${message}". I am currently in offline mode.` });
};
