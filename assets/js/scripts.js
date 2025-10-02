document.getElementById('loginForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if(username === 'test123' && password === 'pw123') {
    window.location.href = 'test_page.html';
  } else {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'Invalid username or password';
  }
});
