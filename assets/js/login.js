const form = document.getElementById('login-form');
const statusEl = document.getElementById('status');

async function checkSession() {
  try {
    const response = await fetch('/api/session', { credentials: 'include' });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (data.authenticated) {
      window.location.href = '/portal.html';
    }
  } catch (error) {
    // Keep quiet on initial check; user can still log in.
  }
}

async function submitLogin(event) {
  event.preventDefault();
  statusEl.textContent = 'Checking credentials...';

  const formData = new FormData(form);
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (!username || !password) {
    statusEl.textContent = 'Enter both username and password.';
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error || 'Login failed.';
      return;
    }

    statusEl.textContent = 'Login successful. Redirecting...';
    window.location.href = '/portal.html';
  } catch (error) {
    statusEl.textContent = 'Network error. Try again.';
  }
}

checkSession();
form.addEventListener('submit', submitLogin);
