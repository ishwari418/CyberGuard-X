const API_URL = 'http://127.0.0.1:3001/api';

document.addEventListener('DOMContentLoaded', () => {
    // Explicitly select elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotForm');
    const resetForm = document.getElementById('resetForm');

    const showForgot = document.getElementById('showForgot');
    const backToLoginForgot = document.querySelector('#forgotForm .backToLogin');
    const backToLoginReset = document.querySelector('#resetForm .backToLogin');

    // Tab Switching Logic
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    console.log("Auth Script Loaded");

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            authTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all forms
            authForms.forEach(form => form.classList.add('hidden'));
            authForms.forEach(form => form.classList.remove('active'));

            // Show target form
            const targetId = tab.dataset.target;
            const targetForm = document.getElementById(targetId);
            if (targetForm) {
                targetForm.classList.remove('hidden');
                targetForm.classList.add('active');
            }
        });
    });

    // Toggle Forms Helper
    function switchForm(formId) {
        // Find tab associated with form
        const targetTab = document.querySelector(`.auth-tab[data-target="${formId}"]`);
        if (targetTab) {
            targetTab.click();
        } else {
            // If no tab (e.g. forgot password), manually handle visibility
            authForms.forEach(form => form.classList.add('hidden'));
            authForms.forEach(form => form.classList.remove('active'));
            const f = document.getElementById(formId);
            if (f) {
                f.classList.remove('hidden');
                f.classList.add('active');
            }
            // Deselect tabs
            authTabs.forEach(t => t.classList.remove('active'));
        }
    }

    if (showForgot) {
        showForgot.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('forgotForm');
        });
    }

    if (backToLoginForgot) {
        backToLoginForgot.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('loginForm');
        });
    }

    if (backToLoginReset) {
        backToLoginReset.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('loginForm');
        });
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Login Submit Clicked");

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Login Successful! Redirecting...");
                    localStorage.setItem('token', data.token);
                    window.location.href = 'app_dashboard.html';
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Connection error. Is the backend running?');
            }
        });
    }

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        // const phone = document.getElementById('signupPhone').value; // Not used in backend yet
        const password = document.getElementById('signupPassword').value;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Account created successfully! Please login.');
                switchForm(loginForm);
            } else {
                alert(data.message || 'Signup failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });

    // Handle Forgot Password
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Forgot Password Submit Clicked"); // DEBUG
        const email = document.getElementById('forgotEmail').value;

        try {
            const response = await fetch(`${API_URL}/auth/forgotpassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.resetUrl) {
                    // Using confirm instead of prompt for better UX in some browsers, or just alert copy
                    prompt("MOCK MODE: Reset Link (Copy this):", data.resetUrl);
                    window.location.href = data.resetUrl;
                } else {
                    alert('Reset link sent to your email!');
                }
                switchForm(loginForm);
            } else {
                alert(data.message || 'Request failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Detailed Error: ' + error.message);
        }
    });

    // Handle Reset Password
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('newPassword').value;

        if (!resetToken) {
            alert('Missing reset token');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/resetpassword/${resetToken}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password reset successfully! Please login.');
                switchForm(loginForm);
                // Clear token from URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                alert(data.message || 'Reset failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});
