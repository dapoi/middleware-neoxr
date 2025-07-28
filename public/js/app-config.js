let currentVersion = '';

function updateSaveButtonState() {
  const input = document.getElementById('appVersionInput');
  const btn = document.getElementById('saveVersionBtn');
  const val = input.value.trim();
  if (!val || val === currentVersion) {
    btn.disabled = true;
    btn.style.opacity = 0.6;
    btn.style.cursor = 'not-allowed';
  } else {
    btn.disabled = false;
    btn.style.opacity = 1;
    btn.style.cursor = 'pointer';
  }
}

async function fetchConfig() {
  try {
    // First check if user is authenticated
    console.log('Checking authentication...');
    const authRes = await fetch('/api/auth-check');
    if (authRes.status === 401) {
      console.log('Not authenticated, redirecting to login');
      window.location.href = '/admin/login';
      return;
    }
    
    console.log('User authenticated, fetching config from /api/app-config...');
    const res = await fetch('/api/app-config');
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Config data received:', data);
    
    document.getElementById('downloaderToggle').checked = data.isDownloaderFeatureActive;
    document.getElementById('imageGenToggle').checked = data.isImageGeneratorFeatureActive;
    document.getElementById('appVersionInput').value = data.version || '';
    currentVersion = data.version || '';

    // Set day dropdown
    const daySelect = document.getElementById('daySelect');
    if (daySelect) {
      if (!data.maintenanceDay || data.maintenanceDay === null) {
        daySelect.value = 'none';
      } else {
        daySelect.value = data.maintenanceDay;
      }
    }

    // Update individual resolution toggles (convert array to boolean for UI)
    const resolutions = data.youtubeResolutions || [];
    document.getElementById('resolution360pToggle').checked = resolutions.includes('360p');
    document.getElementById('resolution480pToggle').checked = resolutions.includes('480p');
    document.getElementById('resolution720pToggle').checked = resolutions.includes('720p');
    document.getElementById('resolution1080pToggle').checked = resolutions.includes('1080p');

    updateSaveButtonState();
    console.log('Config loaded successfully');
  } catch (error) {
    console.error('Error fetching config:', error);
    // Redirect to login on error
    window.location.href = '/admin/login';
  }
}

function showToast(message) {
  let toast = document.getElementById('modernToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'modernToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style="color:#3bbf5c;display:inline-flex;align-items:center;"><svg width='20' height='20' viewBox='0 0 24 24' fill='none'><circle cx='12' cy='12' r='12' fill='#eafbe7'/><path d='M8 12.5l2.5 2.5L16 9' stroke='#3bbf5c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg></span> ${message}`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 1600);
}

async function updateConfig(sendVersion = false) {
  try {
    console.log('Updating config, sendVersion:', sendVersion);
    const daySelect = document.getElementById('daySelect');
    let selectedDay = null;
    if (daySelect) {
      selectedDay = daySelect.value === 'none' ? null : daySelect.value;
    }
    const body = {
      isDownloaderFeatureActive: document.getElementById('downloaderToggle').checked,
      isImageGeneratorFeatureActive: document.getElementById('imageGenToggle').checked,
      youtubeResolutions: {
        '360p': document.getElementById('resolution360pToggle').checked,
        '480p': document.getElementById('resolution480pToggle').checked,
        '720p': document.getElementById('resolution720pToggle').checked,
        '1080p': document.getElementById('resolution1080pToggle').checked
      },
      maintenanceDay: selectedDay
    };
    if (sendVersion) {
      body.version = document.getElementById('appVersionInput').value.trim() || currentVersion;
    }
    console.log('Sending data:', body);
    
    const response = await fetch('/api/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (response.status === 401) {
      // Not authenticated, redirect to login
      window.location.href = '/admin/login';
      return;
    }
    
    console.log('Update response status:', response.status);
    const result = await response.json();
    console.log('Update result:', result);
    
    if (sendVersion) {
      currentVersion = body.version;
      document.getElementById('appVersionInput').value = currentVersion;
      updateSaveButtonState();
      showToast('Version saved!');
    }
  } catch (error) {
    console.error('Error updating config:', error);
  }
}

function initializeEventListeners() {
  document.getElementById('downloaderToggle').addEventListener('change', () => updateConfig(false));
  document.getElementById('imageGenToggle').addEventListener('change', () => updateConfig(false));
  document.getElementById('resolution360pToggle').addEventListener('change', () => updateConfig(false));
  document.getElementById('resolution480pToggle').addEventListener('change', () => updateConfig(false));
  document.getElementById('resolution720pToggle').addEventListener('change', () => updateConfig(false));
  document.getElementById('resolution1080pToggle').addEventListener('change', () => updateConfig(false));
  document.getElementById('saveVersionBtn').addEventListener('click', () => updateConfig(true));
  document.getElementById('appVersionInput').addEventListener('input', updateSaveButtonState);
  const daySelect = document.getElementById('daySelect');
  if (daySelect) {
    daySelect.addEventListener('change', () => updateConfig(false));
  }
  
  // Logout functionality
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await fetch('/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/admin/login';
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app config...');
  initializeEventListeners();
  fetchConfig();
});
