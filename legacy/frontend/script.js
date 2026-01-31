const API_URL = 'http://localhost:5000/api';

// --- Navigation ---
function showSection(id) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    // Show target
    document.getElementById(id).classList.add('active');

    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function setMode(mode) {
    document.getElementById('civ-btn').classList.toggle('active', mode === 'civilian');
    document.getElementById('mil-btn').classList.toggle('active', mode === 'military');

    const root = document.documentElement;
    if (mode === 'military') {
        root.style.setProperty('--accent', '#00ff88'); // Green
        root.style.setProperty('--accent-glow', 'rgba(0, 255, 136, 0.3)');
    } else {
        root.style.setProperty('--accent', '#00f3ff'); // Cyan
        root.style.setProperty('--accent-glow', 'rgba(0, 243, 255, 0.3)');
    }
}

// --- Phishing Guard ---
async function checkPhishing() {
    const input = document.getElementById('phishing-input').value;
    const resultDiv = document.getElementById('phishing-result');

    if (!input) return;

    resultDiv.style.display = 'block';
    resultDiv.className = 'result-box';
    resultDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Scanning global threat databases...';

    try {
        const response = await fetch(`${API_URL}/scan/phishing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: input }),
        });
        const data = await response.json();

        if (data.safe === false) {
            resultDiv.className = 'result-box danger';
            resultDiv.innerHTML = `
                <strong><i class="fa-solid fa-triangle-exclamation"></i> THREAT DETECTED</strong><br>
                ${data.analysis}
            `;
        } else {
            resultDiv.className = 'result-box safe';
            resultDiv.innerHTML = `
                <strong><i class="fa-solid fa-check-circle"></i> SAFE</strong><br>
                ${data.analysis}
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Connection Error. Ensure Backend is running.';
    }
}

// --- SMS Analysis ---
async function checkText() {
    const input = document.getElementById('text-input').value;
    const resultDiv = document.getElementById('text-result');

    if (!input) return;

    resultDiv.style.display = 'block';
    resultDiv.className = 'result-box';
    resultDiv.innerHTML = '<i class="fa-solid fa-brain fa-pulse"></i> AI Analyzing semantics...';

    try {
        const response = await fetch(`${API_URL}/scan/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input }),
        });
        const data = await response.json();

        if (data.is_scam) {
            resultDiv.className = 'result-box danger';
            resultDiv.innerHTML = `
                <strong>SCAM DETECTED (${data.confidence}%)</strong><br>
                ${data.explanation}
            `;
        } else {
            resultDiv.className = 'result-box safe';
            resultDiv.innerHTML = `
                <strong>LIKELY SAFE</strong><br>
                ${data.explanation}
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Connection Error.';
    }
}

// --- File Scanner (VirusTotal Hash) ---
async function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const resultDiv = document.getElementById('file-result');
    resultDiv.style.display = 'block';
    resultDiv.className = 'result-box';
    resultDiv.innerHTML = 'Generating SHA-256 Hash...';

    // 1. Calculate Hash locally (Privacy First)
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    resultDiv.innerHTML = `Hash Generated: ${hashHex.substring(0, 15)}...<br>Checking VirusTotal...`;

    // 2. Send Hash to Backend
    try {
        const response = await fetch(`${API_URL}/scan/file_hash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: hashHex }),
        });
        const data = await response.json();

        if (data.malicious_count > 0) {
            resultDiv.className = 'result-box danger';
            resultDiv.innerHTML = `<strong>MALICIOUS FILE</strong><br>Flagged by ${data.malicious_count} security vendors.`;
        } else if (data.safe) {
            resultDiv.className = 'result-box safe';
            resultDiv.innerHTML = `<strong>CLEAN</strong><br>No threats found in VirusTotal database.`;
        } else {
            resultDiv.className = 'result-box';
            resultDiv.innerHTML = `<strong>UNKNOWN</strong><br>${data.verdict}`;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Error checking file hash.';
    }
}

// --- QR Scanner ---
let html5QrcodeScanner;

function startQRScanner() {
    const resultDiv = document.getElementById('qr-result');
    resultDiv.style.display = 'block';

    if (html5QrcodeScanner) {
        // Already running
        return;
    }

    html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => {
            // Success
            html5QrcodeScanner.stop();
            resultDiv.innerHTML = `QR Content: <strong>${decodedText}</strong><br>Scanning URL...`;

            // Auto-scan the URL found in QR
            document.getElementById('phishing-input').value = decodedText;
            showSection('phishing');
            checkPhishing();
        },
        (errorMessage) => {
            // parse error, ignore
        }
    ).catch(err => {
        resultDiv.innerHTML = "Camera access failed or not supported.";
    });
}

// --- Voice Simulation ---
function simulateVoiceAnalysis() {
    const resultDiv = document.getElementById('voice-result');
    resultDiv.style.display = 'block';
    resultDiv.className = 'result-box danger';
    resultDiv.innerHTML = "Analyzing Audio Stream...";

    setTimeout(() => {
        resultDiv.innerHTML = `
            <strong>⚠️ SPOOF DETECTED</strong><br>
            Caller ID: "Bank Manager"<br>
            Voice Fingerprint: MATCHES "Known Scammer #402"<br>
            <small>Deepfake Probability: 98%</small>
        `;
    }, 2000);
}

// --- AI Chatbot Logic ---
const chatBtn = document.getElementById('chat-widget-btn');
const chatWindow = document.getElementById('chat-widget-window');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatMessages = document.getElementById('chat-messages');

if (chatBtn) {
    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
        }
    });
}
if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });
}

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add User Message
    addMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator or just wait
    // simple "Thinking..." placeholder could work
    const loadingId = addMessage('...', 'bot');

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();

        // Remove loading message
        const loadingMsg = document.querySelector(`[data-id="${loadingId}"]`);
        if (loadingMsg) loadingMsg.remove();

        // Add Bot Reply
        addMessage(data.reply, 'bot');

    } catch (error) {
        console.error(error);
        const loadingMsg = document.querySelector(`[data-id="${loadingId}"]`);
        if (loadingMsg) loadingMsg.remove();
        addMessage("Sorry, I can't reach the server right now.", 'bot');
    }
}

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', `${sender}-message`);
    div.innerText = text;

    // Add a unique ID for loading messages
    const id = Date.now();
    div.setAttribute('data-id', id);

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll
    return id;
}

if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendChatMessage);
}
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}
