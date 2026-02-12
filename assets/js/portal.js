const accountChip = document.getElementById('account-chip');
const logoutBtn = document.getElementById('logout-btn');

const serviceLinks = {
  gitlab: 'https://git.aalling93.com',
  nextcloud: '#',
  cv: 'https://aalling93-my-site-app-kzwtkf.streamlit.app/',
  app: 'http://kaaso-tuf-gaming-x870-plus-wifi-10de:5163'
};

function wireServiceLinks() {
  document.querySelectorAll('[data-service-link]').forEach((link) => {
    const key = link.getAttribute('data-service-link');
    const href = serviceLinks[key] || '#';
    link.href = href;
    if (href === '#') {
      link.textContent = 'Not Configured Yet';
      return;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open Service';
    }
  });
}

async function loadSession() {
  try {
    const response = await fetch('/api/session', { credentials: 'include' });
    if (!response.ok) {
      window.location.href = '/login.html';
      return;
    }

    const data = await response.json();
    if (!data.authenticated) {
      window.location.href = '/login.html';
      return;
    }

    accountChip.textContent = `Signed in as ${data.username}`;
  } catch (error) {
    accountChip.textContent = 'Session check failed';
    window.location.href = '/login.html';
  }
}

async function logout(event) {
  event.preventDefault();
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include'
  });
  window.location.href = '/login.html';
}

wireServiceLinks();
loadSession();
logoutBtn.addEventListener('click', logout);
