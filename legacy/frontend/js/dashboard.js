const API_URL = 'http://localhost:3001/api';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // Fetch User Profile
    try {
        const userRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userRes.ok) throw new Error('Auth failed');

        const user = await userRes.json();
        document.getElementById('userName').textContent = user.name || user.username;
    } catch (e) {
        console.error("Auth Check Failed:", e);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }

    // Fetch Incidents
    try {
        const incidentsRes = await fetch(`${API_URL}/api/incidents`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const incidents = await incidentsRes.json();
        document.getElementById('incidentCount').textContent = incidents.length;

        const container = document.getElementById('incidentsContainer');
        container.innerHTML = '';

        if (incidents.length === 0) {
            container.innerHTML = '<p class="empty-state">No incidents reported yet.</p>';
            return;
        }

        incidents.forEach(inc => {
            const card = document.createElement('div');
            card.className = 'incident-card';
            card.innerHTML = `
                <div class="incident-header">
                    <span class="badge ${inc.status.toLowerCase()}">${inc.status}</span>
                    <span class="date">${new Date(inc.created_at).toLocaleDateString()}</span>
                </div>
                <h3>${inc.category}</h3>
                <p>${inc.summary}</p>
                <div class="incident-actions">
                    <button class="btn-sm" onclick="alert('Generating PDF...')">Download Report</button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
    }
});
