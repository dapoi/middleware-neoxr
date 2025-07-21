document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  const buttonText = document.getElementById('buttonText');
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  
  // Disable button and show loading
  btn.disabled = true;
  buttonText.innerHTML = '<div class="loading-spinner"></div>';
  errorDiv.style.display = 'none';
  
  try {
    const response = await fetch('/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Show success state briefly
      buttonText.innerHTML = '✓ Success!';
      btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      // Redirect to config page after short delay
      setTimeout(() => {
        window.location.href = '/app-config.html';
      }, 800);
    } else {
      // Show error with icon
      errorText.textContent = data.error || 'Login failed';
      errorDiv.style.display = 'flex';
      
      // Shake animation for error
      btn.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        btn.style.animation = '';
      }, 500);
    }
  } catch (error) {
    errorText.textContent = 'Network error. Please check your connection.';
    errorDiv.style.display = 'flex';
    
    // Shake animation for error
    btn.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      btn.style.animation = '';
    }, 500);
  } finally {
    // Re-enable button after delay
    setTimeout(() => {
      btn.disabled = false;
      buttonText.textContent = 'Sign In';
      btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }, 1000);
  }
});

// Focus username field and add enter key support
document.getElementById('username').focus();

// Add floating label effect
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('focus', () => {
    input.parentElement.style.transform = 'scale(1.02)';
  });
  
  input.addEventListener('blur', () => {
    input.parentElement.style.transform = 'scale(1)';
  });
});
