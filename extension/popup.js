// Popup logic for HireTrack AI Job Clipper

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('tokenInput');
  const backendUrlInput = document.getElementById('backendUrlInput');
  const saveAuthBtn = document.getElementById('saveAuthBtn');
  const autoConnectBtn = document.getElementById('autoConnectBtn');
  const authSection = document.getElementById('authSection');
  const clipSection = document.getElementById('clipSection');

  const roleField = document.getElementById('roleField');
  const companyField = document.getElementById('companyField');
  const locationField = document.getElementById('locationField');
  const salaryField = document.getElementById('salaryField');
  const jdField = document.getElementById('jdField');
  const jdChars = document.getElementById('jdChars');
  const clipBtn = document.getElementById('clipBtn');
  const reExtractBtn = document.getElementById('reExtractBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const statusMsg = document.getElementById('statusMsg');

  let currentUrl = '';

  jdField.addEventListener('input', () => {
    jdChars.textContent = jdField.value.length;
  });

  async function tryAutoConnect(silent = false) {
    chrome.tabs.query({}, async (tabs) => {
      const hiretrackTab = tabs.find(
        (t) => t.url && (t.url.includes('localhost:5173') || t.url.includes('hiretrack'))
      );

      if (!hiretrackTab || !hiretrackTab.id) {
        if (!silent) {
          showStatus('No open HireTrack tab found. Please open http://localhost:5173 and log in!', 'error');
        }
        return;
      }

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: hiretrackTab.id },
          func: () => {
            return {
              token:
                localStorage.getItem('accessToken') ||
                localStorage.getItem('hiretrack_token') ||
                (window).__HIRETRACK_TOKEN__ ||
                null,
            };
          },
        });

        let token = results && results[0] && results[0].result ? results[0].result.token : null;

        // Fallback: If localStorage was empty, attempt direct refresh fetch
        if (!token) {
          try {
            const resp = await fetch('http://localhost:5000/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data.accessToken) {
                token = data.accessToken;
              }
            }
          } catch (e) {
            // ignore
          }
        }

        if (token) {
          const backend = 'http://localhost:5000';
          chrome.storage.sync.set({ hiretrack_token: token, hiretrack_backend: backend }, () => {
            showStatus('⚡ Successfully connected to HireTrack AI!', 'success');
            setTimeout(() => {
              authSection.classList.add('hidden');
              clipSection.classList.remove('hidden');
              scrapeActiveTab();
            }, 500);
          });
        } else {
          if (!silent) {
            showStatus('Please refresh your HireTrack tab once (press F5) so it can sync your token!', 'error');
          }
        }
      } catch (err) {
        if (!silent) {
          showStatus('Could not read tab: ' + err.message, 'error');
        }
      }
    });
  }

  if (autoConnectBtn) {
    autoConnectBtn.addEventListener('click', () => {
      tryAutoConnect(false);
    });
  }

  // Load saved credentials
  chrome.storage.sync.get(['hiretrack_token', 'hiretrack_backend'], (stored) => {
    if (stored.hiretrack_token) {
      tokenInput.value = stored.hiretrack_token;
    }
    if (stored.hiretrack_backend) {
      backendUrlInput.value = stored.hiretrack_backend;
    }

    if (!stored.hiretrack_token) {
      authSection.classList.remove('hidden');
      clipSection.classList.add('hidden');
      // Attempt silent auto-connect if user already has HireTrack open in Edge
      tryAutoConnect(true);
    } else {
      authSection.classList.add('hidden');
      clipSection.classList.remove('hidden');
      scrapeActiveTab();
    }
  });

  saveAuthBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const backend = backendUrlInput.value.trim() || 'http://localhost:5000';

    if (!token) {
      showStatus('Please provide an access token.', 'error');
      return;
    }

    chrome.storage.sync.set({ hiretrack_token: token, hiretrack_backend: backend }, () => {
      showStatus('Settings saved successfully!', 'success');
      setTimeout(() => {
        authSection.classList.add('hidden');
        clipSection.classList.remove('hidden');
        scrapeActiveTab();
      }, 1000);
    });
  });

  settingsBtn.addEventListener('click', () => {
    authSection.classList.toggle('hidden');
    clipSection.classList.toggle('hidden');
  });

  reExtractBtn.addEventListener('click', () => {
    scrapeActiveTab();
  });

  function scrapeActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const tab = tabs[0];
      currentUrl = tab.url || '';

      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_JOB' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.data) {
          // Fallback extraction
          roleField.value = tab.title ? tab.title.split('|')[0].trim() : 'Software Engineer';
          companyField.value = 'Company';
          locationField.value = 'Remote / Unspecified';
        } else {
          const d = response.data;
          roleField.value = d.role || '';
          companyField.value = d.company || '';
          locationField.value = d.location || '';
          salaryField.value = d.salary || '';
          jdField.value = d.jdText || '';
          jdChars.textContent = (d.jdText || '').length;
        }
      });
    });
  }

  clipBtn.addEventListener('click', async () => {
    const role = roleField.value.trim();
    const company = companyField.value.trim();
    const location = locationField.value.trim();
    const salary = salaryField.value.trim();
    const jdText = jdField.value.trim();

    if (!role || !company) {
      showStatus('Role and Company are required.', 'error');
      return;
    }

    clipBtn.disabled = true;
    clipBtn.innerHTML = '<span>Saving...</span>';

    chrome.storage.sync.get(['hiretrack_token', 'hiretrack_backend'], async (stored) => {
      const token = stored.hiretrack_token;
      const backend = stored.hiretrack_backend || 'http://localhost:5000';

      try {
        const response = await fetch(`${backend}/api/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            company,
            role,
            location: location || undefined,
            salary: salary || undefined,
            jobUrl: currentUrl || undefined,
            jdText: jdText || undefined,
            status: 'wishlist',
            notes: `Clipped with HireTrack Chrome Extension on ${new Date().toLocaleDateString()}`,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        showStatus(`🎯 Saved to Wishlist: ${company} - ${role}`, 'success');
        setTimeout(() => window.close(), 2000);
      } catch (err) {
        showStatus(`Failed to save: ${err.message}`, 'error');
      } finally {
        clipBtn.disabled = false;
        clipBtn.innerHTML = '<span>+ Save to HireTrack Wishlist</span>';
      }
    });
  });

  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
    statusMsg.classList.remove('hidden');
  }
});
