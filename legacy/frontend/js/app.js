const API_URL = 'http://127.0.0.1:3001/api';

// Helper for Authenticated Requests
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        throw new Error("No token");
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        throw new Error("Unauthorized");
    }

    return response.json();
}

document.addEventListener('DOMContentLoaded', () => {
    // Check Auth Immediately
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return;
    }
    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.dataset.view;

            // Update Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update View
            views.forEach(view => {
                if (view.id === `${targetView}-view`) {
                    view.classList.remove('hidden');
                    view.classList.add('active');
                } else {
                    view.classList.add('hidden');
                    view.classList.remove('active');
                }
            });

            if (!localStorage.getItem('token')) return;

            if (targetView === 'cyber-assist') loadIncidents();
            if (targetView === 'voice-shield') loadCallLogs();
            if (targetView === 'secure-vault') loadVaultItems();
        });
    });

    // --- Authentication ---
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const closeModal = document.querySelectorAll('.close-modal');

    // Forgot Password Elements
    const showForgotBtn = document.getElementById('showForgotBtn');
    const backToLoginLinks = document.querySelectorAll('.backToLogin');
    const forgotTab = document.getElementById('forgotTab');

    // Check URL for Reset Token
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('resetToken');

    if (resetToken) {
        authModal.classList.remove('hidden');
        authForms.forEach(form => form.classList.add('hidden'));
        document.getElementById('resetForm').classList.remove('hidden');
    }

    checkAuth();

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.classList.remove('hidden');
        // Reset to login form
        authTabs[0].click();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        checkAuth();
        alert('Logged out successfully');
    });

    closeModal.forEach(btn => {
        btn.addEventListener('click', () => {
            authModal.classList.add('hidden');
            document.getElementById('incidentModal').classList.add('hidden');
            document.getElementById('vaultModal').classList.add('hidden');
        });
    });

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.id === 'forgotTab') return; // Don't manually click hidden tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.target;
            authForms.forEach(form => {
                if (form.id === target) form.classList.remove('hidden');
                else form.classList.add('hidden');
            });
        });
    });

    // Show Forgot Password Form
    if (showForgotBtn) {
        showForgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authForms.forEach(form => form.classList.add('hidden'));
            document.getElementById('forgotForm').classList.remove('hidden');
            // Deselect tabs
            authTabs.forEach(t => t.classList.remove('active'));
        });
    }

    // Back to Login
    backToLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            authTabs[0].click(); // Simulate click on Login tab
        });
    });

    // Login Submit
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                authModal.classList.add('hidden');
                checkAuth();
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            alert(`Connection error: ${err.message}. Ensure backend is running.`);
        }
    });

    // Signup Submit
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (res.ok) {
                alert('Account created! Please login.');
                authTabs[0].click();
            } else {
                const data = await res.json();
                alert(data.message || 'Signup failed');
            }
        } catch (err) {
            console.error(err);
            alert(`Connection error: ${err.message}. Ensure backend is running.`);
        }
    });

    // Forgot Password Submit
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;

        try {
            const res = await fetch(`${API_URL}/auth/forgotpassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                alert('Reset link sent to your email.');
                authTabs[0].click();
            } else {
                alert(data.message || 'Request failed');
            }
        } catch (err) {
            console.error(err);
            alert('Error sending request');
        }
    });

    // Reset Password Submit
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('newPassword').value;

        if (!resetToken) return alert("Missing token");

        try {
            const res = await fetch(`${API_URL}/auth/resetpassword/${resetToken}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (res.ok) {
                alert('Password updated successfully! Please login.');
                window.history.replaceState({}, document.title, window.location.pathname); // Clear token
                authTabs[0].click();
            } else {
                alert(data.message || 'Reset failed');
            }
        } catch (err) {
            console.error(err);
            alert('Error resetting password');
        }
    });


    async function checkAuth() {
        const token = localStorage.getItem('token');
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userName = document.getElementById('userName');

        if (token) {
            authSection.classList.add('hidden');
            userSection.classList.remove('hidden');
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    userName.textContent = user.name;
                } else {
                    localStorage.removeItem('token');
                    checkAuth();
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            authSection.classList.remove('hidden');
            userSection.classList.add('hidden');
        }
    }

    // --- Phishing Guard ---
    const phishingTabs = document.querySelectorAll('.module-tab[data-tab]');
    phishingTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            phishingTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById(`phishing-${tabName}-tab`)?.classList.remove('hidden');
        });
    });

    document.getElementById('btn-phishing-text').addEventListener('click', async () => {
        const text = document.getElementById('phishingText').value;
        if (!text) return alert("Please enter text to analyze");

        const resultBox = document.getElementById('phishingTextResult');
        resultBox.innerHTML = '<p>Analyzing...</p>';
        resultBox.classList.remove('hidden');

        try {
            const res = await fetchWithAuth(`${API_URL}/phishing/analyze/text`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });

            if (res.is_phishing) {
                resultBox.innerHTML = `
                    <div class="alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>PHISHING DETECTED</h3>
                        <p>Risk Score: ${res.risk_score}/100</p>
                        <ul>${res.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>`;
            } else {
                resultBox.innerHTML = `
                    <div class="alert-safe">
                        <i class="fas fa-check-circle"></i>
                        <h3>SAFE CONTENT</h3>
                        <p>Risk Score: ${res.risk_score}/100</p>
                    </div>`;
            }
        } catch (error) {
            console.error(error);
            resultBox.innerHTML = '<p class="error">Analysis failed</p>';
        }
    });

    document.getElementById('btn-phishing-url').addEventListener('click', async () => {
        const url = document.getElementById('phishingUrl').value;
        if (!url) return alert("Please enter a URL");

        const resultBox = document.getElementById('phishingUrlResult');
        resultBox.innerHTML = '<p>Scanning URL...</p>';
        resultBox.classList.remove('hidden');

        try {
            const res = await fetchWithAuth(`${API_URL}/phishing/analyze/url`, {
                method: 'POST',
                body: JSON.stringify({ url })
            });

            if (res.is_phishing) {
                resultBox.innerHTML = `
                    <div class="alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>DANGEROUS URL</h3>
                        <p>Risk Score: ${res.risk_score}/100</p>
                        <p>${res.details}</p>
                        ${res.reasons ? `<ul style="text-align:left; margin-top:10px; font-size:13px;">${res.reasons.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
                    </div>`;
            } else {
                resultBox.innerHTML = `
                    <div class="alert-safe">
                        <i class="fas fa-shield-alt"></i>
                        <h3>SAFE URL</h3>
                        <p>Risk Score: ${res.risk_score}/100</p>
                        <p>${res.details}</p>
                        ${res.reasons ? `<ul style="text-align:left; margin-top:10px; font-size:13px; color:#ddd;">${res.reasons.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
                    </div>`;
            }
        } catch (error) {
            console.error(error);
            resultBox.innerHTML = '<p class="error">Scan failed</p>';
        }

    });

    // --- App Sentinel ---
    document.getElementById('appFileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const resultBox = document.getElementById('appScanResult');
        resultBox.innerHTML = '<p>Scanning File with VirusTotal...</p>';
        resultBox.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetchWithAuth(`${API_URL}/app-sentinel/scan-file`, {
                method: 'POST',
                body: formData,
                headers: {} // Let browser set Content-Type for FormData
            });

            const color = res.malicious_count > 0 ? 'danger' : 'safe';
            const icon = res.malicious_count > 0 ? 'bug' : 'shield-check';

            resultBox.innerHTML = `
                <div class="alert-${color}">
                    <i class="fas fa-${icon}"></i>
                    <h3>${res.verdict.toUpperCase()}</h3>
                    <p>Filename: ${res.filename}</p>
                    <p>Malicious Detections: ${res.malicious_count}/${res.total_scanners}</p>
                    <p class="text-sm">${res.details}</p>
                </div>`;
        } catch (error) {
            console.error(error);
            resultBox.innerHTML = '<p class="error">Scan failed</p>';
        }
    });

    // --- Voice Shield ---
    document.getElementById('btn-voice-check').addEventListener('click', async () => {
        const number = document.getElementById('callerNumber').value;
        if (!number) return alert("Enter a phone number");

        const resultBox = document.getElementById('callerResult');
        resultBox.innerHTML = '<p>Checking Number...</p>';
        resultBox.classList.remove('hidden');

        try {
            const res = await fetchWithAuth(`${API_URL}/voice/check-number`, {
                method: 'POST',
                body: JSON.stringify({ phone_number: number })
            });

            const color = res.is_spam ? 'danger' : 'safe';
            resultBox.innerHTML = `
                <div class="alert-${color}">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-${res.is_spam ? 'phone-slash' : 'check-circle'}" style="font-size: 24px;"></i>
                        <div>
                            <h3 style="margin:0; font-size:18px;">${res.caller_name}</h3>
                            <span style="font-size:12px; opacity:0.8;">${res.carrier} | ${res.location}</span>
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <p style="margin: 5px 0;"><strong>Risk Score:</strong> ${res.risk_score}/100</p>
                        <p style="margin: 5px 0;"><strong>Carrier:</strong> ${res.carrier}</p>
                        <p style="margin: 5px 0;"><strong>Location:</strong> ${res.location}</p>
                        <p style="margin: 5px 0; font-size: 13px; color: #ddd;">${res.details}</p>
                    </div>
                </div>`;
            loadCallLogs(); // Refresh logs
        } catch (error) {
            console.error(error);
            resultBox.innerHTML = '<p class="error">Check failed</p>';
        }
    });

    // --- QR Analyzer ---
    document.getElementById('qrInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const resultBox = document.getElementById('qrResult');
        resultBox.innerHTML = '<p>Decoding & Scanning...</p>';
        resultBox.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetchWithAuth(`${API_URL}/qr/decode`, {
                method: 'POST',
                body: formData,
                headers: {}
            });

            if (res.error) {
                resultBox.innerHTML = `<p class="error">${res.error}</p>`;
                return;
            }

            const color = res.is_safe ? 'safe' : 'danger';
            resultBox.innerHTML = `
                <div class="alert-${color}">
                    <i class="fas fa-qrcode"></i>
                    <h3>${res.is_safe ? 'SAFE QR' : 'RISKY QR'}</h3>
                    <p>Content: <strong>${res.content}</strong></p>
                    <p>${res.details}</p>
                </div>`;
        } catch (error) {
            console.error(error);
            resultBox.innerHTML = '<p class="error">Analysis failed</p>';
        }
    });
    async function loadCallLogs() {
        try {
            const logs = await fetchWithAuth(`${API_URL}/voice/logs`);
            const container = document.getElementById('callLogsList');
            if (logs.length === 0) {
                container.innerHTML = '<p class="text-muted">No recent logs.</p>';
                return;
            }

            container.innerHTML = logs.map(log => `
                <div class="call-item ${log.is_spam ? 'blocked' : ''}">
                    <i class="fas fa-${log.is_spam ? 'phone-slash' : 'phone'}"></i>
                    <div>
                        <h3>${log.phone_number}</h3>
                        <p>${log.caller_name || 'Unknown'}</p>
                    </div>
                    <span class="time">${new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error(error);
        }
    }

    // --- Secure Vault ---
    document.getElementById('btn-vault-add').addEventListener('click', () => {
        document.getElementById('vaultModal').classList.remove('hidden');
    });

    document.getElementById('btn-vault-close').addEventListener('click', () => {
        document.getElementById('vaultModal').classList.add('hidden');
    });

    document.getElementById('vaultForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('vaultTitle').value;
        const type = document.getElementById('vaultType').value;
        const content = document.getElementById('vaultContent').value;

        try {
            await fetchWithAuth(`${API_URL}/vault/upload`, {
                method: 'POST',
                body: JSON.stringify({ title, type, data: content })
            });
            document.getElementById('vaultModal').classList.add('hidden');
            loadVaultItems();
            e.target.reset();
        } catch (error) {
            alert("Failed to save item");
        }
    });

    async function loadVaultItems() {
        try {
            const items = await fetchWithAuth(`${API_URL}/vault/items`);
            const grid = document.getElementById('vaultGrid');

            grid.innerHTML = items.map(item => `
                <div class="vault-item">
                    <i class="fas fa-${item.type === 'PASSWORD' ? 'key' : 'file-alt'}"></i>
                    <span>${item.title}</span>
                    <button class="btn-icon delete-btn" data-id="${item.id}">&times;</button>
                </div>
            `).join('');

            // Re-attach delete listeners
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteVaultItem(btn.dataset.id);
                });
            });
        } catch (error) {
            console.error(error);
        }
    }

    async function deleteVaultItem(id) {
        if (!confirm("Delete this item?")) return;
        try {
            await fetchWithAuth(`${API_URL}/vault/items/${id}`, { method: 'DELETE' });
            loadVaultItems();
        } catch (error) {
            alert("Failed to delete item");
        }
    }

    // --- Cyber Assist (Legacy) ---
    const incidentModal = document.getElementById('incidentModal');
    const incidentForm = document.getElementById('incidentForm');

    window.showIncidentForm = (category) => {
        if (!localStorage.getItem('token')) {
            alert('Please login to report incidents.');
            authModal.classList.remove('hidden');
            return;
        }
        document.getElementById('incidentCategory').value = category;
        document.getElementById('displayCategory').value = category;
        incidentModal.classList.remove('hidden');
    };

    window.activateEmergencyMode = () => {
        alert('EMERGENCY MODE ACTIVATED\n\n- Blocking unknown calls...\n- Disabling non-essential apps...\n- Sending location to trusted contacts...\n\nSTAY CALM. DO NOT SHARE OTPs.');
    };

    document.getElementById('aiAnalyzeBtn').addEventListener('click', async () => {
        const summary = document.getElementById('incidentSummary').value;
        if (!summary) return alert('Enter a description first.');

        const resultDiv = document.getElementById('aiAnalysisResult');
        resultDiv.innerHTML = 'Analyzing...';
        resultDiv.classList.remove('hidden');

        try {
            const res = await fetch(`${API_URL}/incidents/analyze`, { // Assuming new route or mock
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: summary })
            });
            const data = await res.json();
            resultDiv.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px solid ${data.risk_score > 50 ? 'red' : 'green'}; border-radius:5px;">
                    <strong>Risk Score: ${data.risk_score}/100</strong><br>
                    Verdict: ${data.verdict}<br>
                    Advice: ${data.suggested_action}
                </div>
            `;
        } catch (e) {
            resultDiv.innerHTML = 'Analysis failed.';
        }
    });

    incidentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const category = document.getElementById('incidentCategory').value;
        const summary = document.getElementById('incidentSummary').value;

        try {
            const res = await fetch(`${API_URL}/incidents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ category, summary })
            });

            if (res.ok) {
                alert('Incident Reported Successfully');
                incidentModal.classList.add('hidden');
                loadIncidents();
                incidentForm.reset();
                document.getElementById('aiAnalysisResult').classList.add('hidden');
            } else {
                alert('Failed to report incident');
            }
        } catch (e) {
            console.error(e);
            alert('Error submitting report');
        }
    });

    async function loadIncidents() {
        const token = localStorage.getItem('token');
        if (!token) return;

        const listContainer = document.getElementById('incidentsList');
        try {
            const res = await fetch(`${API_URL}/incidents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const incidents = await res.json();

            if (incidents.length === 0) {
                listContainer.innerHTML = '<p class="text-muted">No incidents reported.</p>';
                return;
            }

            listContainer.innerHTML = incidents.map(inc => `
                <div style="background:#222; padding:15px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--primary-green);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <strong>${inc.category}</strong>
                        <span style="font-size:12px; color:#888;">${new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style="font-size:14px; color:#ccc;">${inc.summary}</p>
                    <div style="margin-top:5px;">
                        <span style="font-size:10px; background:#333; padding:2px 6px; border-radius:4px;">${inc.status}</span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error(e);
        }
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

        const loadingId = addMessage('...', 'bot');

        try {
            // NOTE: API_URL in this file is http://localhost:3001/api, so we simply append /chat
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });
            const data = await response.json();

            const loadingMsg = document.querySelector(`[data-id="${loadingId}"]`);
            if (loadingMsg) loadingMsg.remove();

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

        const id = Date.now();
        div.setAttribute('data-id', id);

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
});
