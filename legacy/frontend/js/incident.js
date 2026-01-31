const API_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // AI Analysis
    document.getElementById('aiCheckBtn').addEventListener('click', async () => {
        const summary = document.getElementById('summary').value;
        if (!summary) return alert('Please enter a summary first.');

        const resultDiv = document.getElementById('aiResult');
        resultDiv.innerHTML = 'Analyzing...';
        resultDiv.classList.remove('hidden');

        try {
            const res = await fetch(`${API_URL}/api/analyze/risk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: summary })
            });
            const data = await res.json();

            resultDiv.innerHTML = `
                <h4>Risk Score: ${data.risk_score}/100</h4>
                <p><strong>Verdict:</strong> ${data.verdict}</p>
                <p>${data.suggested_action}</p>
            `;
        } catch (e) {
            resultDiv.innerHTML = 'Analysis failed.';
        }
    });

    // Submit Form
    document.getElementById('incidentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = document.getElementById('category').value;
        const summary = document.getElementById('summary').value;
        const fileInput = document.getElementById('evidenceFile');

        try {
            // 1. Create Incident
            const res = await fetch(`${API_URL}/api/incidents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ category, summary })
            });

            if (!res.ok) throw new Error('Failed to create incident');
            const incident = await res.json();

            // 2. Upload Evidence (if any)
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);

                await fetch(`${API_URL}/api/evidence/upload?incident_id=${incident.id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            }

            alert('Incident Reported Successfully!');
            window.location.href = 'dashboard.html';

        } catch (e) {
            console.error(e);
            alert('Error submitting report.');
        }
    });
});
