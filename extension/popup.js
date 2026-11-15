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
  const layerTag = document.getElementById('layerTag');
  const portalLabel = document.getElementById('portalLabel');

  let currentUrl = '';
  let currentPortal = 'Company Portal';

  function deriveSourcePortal(url) {
    if (!url) return 'Company Portal';
    try {
      const host = new URL(url).hostname.replace('www.', '').toLowerCase();
      if (host.includes('linkedin.com')) return 'LinkedIn';
      if (host.includes('indeed.') || host.includes('indeedapply')) return 'Indeed';
      if (host.includes('naukri.com')) return 'Naukri';
      if (host.includes('greenhouse.io')) return 'Greenhouse (Company Portal)';
      if (host.includes('lever.co')) return 'Lever (Company Portal)';
      if (host.includes('myworkdayjobs.com')) return 'Workday (Company Portal)';
      if (host.includes('glassdoor.com')) return 'Glassdoor';
      if (host.includes('wellfound.com')) return 'Wellfound';
      return `Company Portal (${host})`;
    } catch {
      return 'Company Portal';
    }
  }

  jdField.addEventListener('input', () => {
    jdChars.textContent = jdField.value.length;
  });

  function findHiretrackTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const matches = (tabs || []).filter(
          (t) =>
            t.id &&
            t.url &&
            (t.url.includes('localhost:5173') ||
              t.url.includes('hiretrack') ||
              (t.title && t.title.toLowerCase().includes('hiretrack')))
        );
        resolve(matches);
      });
    });
  }

  async function notifyHiretrackTabs() {
    const tabs = await findHiretrackTabs();
    await Promise.all(
      tabs.map((tab) =>
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            func: () => window.postMessage({ type: 'HIRETRACK_JOB_ADDED' }, window.location.origin),
          })
          .catch(() => {})
      )
    );
  }

  async function fetchFreshToken(backend = 'http://localhost:5000') {
    const [hiretrackTab] = await findHiretrackTabs();

    if (hiretrackTab && hiretrackTab.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: hiretrackTab.id },
          func: () =>
            localStorage.getItem('hiretrack_token') ||
            localStorage.getItem('accessToken') ||
            window.__HIRETRACK_TOKEN__ ||
            null,
        });
        const tabToken = results && results[0] && results[0].result ? results[0].result : null;
        if (tabToken) {
          return tabToken;
        }
      } catch {
        // ignore script injection errors
      }
    }

    // Fallback: try refresh cookie against backend
    try {
      const resp = await fetch(`${backend}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.accessToken) {
          return data.accessToken;
        }
      }
    } catch {
      // ignore network errors
    }

    return null;
  }

  async function tryAutoConnect(silent = false) {
    const backend = backendUrlInput.value.trim() || 'http://localhost:5000';
    const token = await fetchFreshToken(backend);

    if (token) {
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
        showStatus('No active HireTrack session found. Please open http://localhost:5173 and log in!', 'error');
      }
    }
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

  async function applyJobData(d, fallbackTitle) {
    if (d?.url) {
      currentUrl = d.url;
    }
    currentPortal = d?.sourcePortal || deriveSourcePortal(currentUrl);
    if (portalLabel) {
      portalLabel.textContent = currentPortal;
    }
    if (d?.layer && layerTag) {
      layerTag.textContent = d.layer;
    }

    let role = d?.role || (fallbackTitle ? fallbackTitle.split(/[-|–•]/)[0].trim() : '') || 'Software Engineer';
    let company = d?.company || 'Company';
    let location = d?.location || 'Remote / Unspecified';
    let salary = d?.salary || '';
    let jdText = d?.jdText || '';

    // Immediately populate all fields so the user sees extracted data with zero lag
    roleField.value = role;
    companyField.value = company;
    locationField.value = location;
    salaryField.value = salary;
    jdField.value = jdText;
    jdChars.textContent = jdText.length;

    // Only call Layer 4 Backend AI Fallback if critical fields are missing and clean text is available
    const needsAi = (!jdText || jdText.length < 50 || company === 'Company') && d?.cleanDomText && d.cleanDomText.length > 50;

    if (needsAi) {
      if (layerTag) layerTag.textContent = '⚡ AI Enhancing...';
      chrome.storage.sync.get(['hiretrack_token', 'hiretrack_backend'], async (stored) => {
        const token = stored.hiretrack_token;
        const backend = stored.hiretrack_backend || 'http://localhost:5000';
        if (token) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          try {
            const res = await fetch(`${backend}/api/applications/extract-job`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                rawText: d.cleanDomText,
                url: currentUrl,
              }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const aiData = await res.json();
              if (aiData.role && role === 'Software Engineer') roleField.value = aiData.role;
              if (aiData.company && company === 'Company') companyField.value = aiData.company;
              if (aiData.location && location === 'Remote / Unspecified') locationField.value = aiData.location;
              if (aiData.salary && !salary) salaryField.value = aiData.salary;
              if (aiData.jdText && (!jdText || jdText.length < 50)) {
                jdField.value = aiData.jdText;
                jdChars.textContent = aiData.jdText.length;
              }
              if (layerTag) layerTag.textContent = '✨ L4:Gemini AI';
            } else {
              if (layerTag) layerTag.textContent = d?.layer || 'L4:Local';
            }
          } catch {
            clearTimeout(timeoutId);
            if (layerTag) layerTag.textContent = d?.layer || 'L4:Local';
          }
        } else {
          if (layerTag) layerTag.textContent = d?.layer || 'L4:Local';
        }
      });
    }
  }

  function scrapeActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const tab = tabs[0];
      currentUrl = tab.url || '';

      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_JOB' }, async (response) => {
        if (!chrome.runtime.lastError && response && response.data && (response.data.jdText || response.data.role)) {
          applyJobData(response.data, tab.title);
          return;
        }

        // If content script was not running (e.g. tab was open before extension reload), inject dynamically!
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });

          chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_JOB' }, (res2) => {
            if (!chrome.runtime.lastError && res2 && res2.data) {
              applyJobData(res2.data, tab.title);
            } else {
              applyJobData({}, tab.title);
            }
          });
        } catch {
          applyJobData({}, tab.title);
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
      let token = stored.hiretrack_token;
      const backend = stored.hiretrack_backend || 'http://localhost:5000';

      const payload = {
        company,
        role,
        location: location || undefined,
        salary: salary || undefined,
        jobUrl: currentUrl || undefined,
        sourcePortal: currentPortal || undefined,
        jdText: jdText || undefined,
        status: 'wishlist',
        notes: `Applied on: ${currentPortal}\nClipped with HireTrack Extension on ${new Date().toLocaleDateString()}`,
      };

      const sendSave = (authToken) =>
        fetch(`${backend}/api/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });

      try {
        let response = await sendSave(token);

        // Auto-heal expired token on 401
        if (response.status === 401) {
          const freshToken = await fetchFreshToken(backend);
          if (freshToken) {
            token = freshToken;
            chrome.storage.sync.set({ hiretrack_token: freshToken });
            response = await sendSave(freshToken);
          }
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            throw new Error('Session expired. Please log in to HireTrack (http://localhost:5173) and click 1-Click Auto-Connect.');
          }
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        await notifyHiretrackTabs();
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
