// Content script for LinkedIn & Naukri Job Detail Pages

function extractJobDetails() {
  const url = window.location.href;
  let company = '';
  let role = '';
  let location = '';
  let jdText = '';
  let salary = '';

  if (url.includes('linkedin.com')) {
    // LinkedIn Job View Selectors
    const roleEl = document.querySelector(
      '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, h1'
    );
    if (roleEl) role = roleEl.innerText.trim();

    const compEl = document.querySelector(
      '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description a'
    );
    if (compEl) company = compEl.innerText.trim();

    const locEl = document.querySelector(
      '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__workplace-type'
    );
    if (locEl) location = locEl.innerText.trim();

    const jdEl = document.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content');
    if (jdEl) jdText = jdEl.innerText.trim();
  } else if (url.includes('naukri.com')) {
    // Naukri Job View Selectors
    const roleEl = document.querySelector('h1.styles_jd-header-title__rZwM1, h1.title, h1');
    if (roleEl) role = roleEl.innerText.trim();

    const compEl = document.querySelector('.styles_jd-header-comp-name__MvqAI, a.comp-name, .company-name');
    if (compEl) company = compEl.innerText.trim();

    const locEl = document.querySelector('.styles_jdn-header-loc__zG8lU, .loc, .styles_jdn-header-loc__zG8lU span');
    if (locEl) location = locEl.innerText.trim();

    const salEl = document.querySelector('.styles_jdn-header-sal__qujq4, .salary');
    if (salEl) salary = salEl.innerText.trim();

    const jdEl = document.querySelector('.styles_job-desc-container__txpYf, .dang-inner-html, section.styles_job-desc-container__txpYf');
    if (jdEl) jdText = jdEl.innerText.trim();
  }

  return {
    url,
    role: role || document.title.split('|')[0].trim() || 'Software Engineer',
    company: company || 'Company',
    location: location || 'Remote / Unspecified',
    salary: salary || '',
    jdText: jdText || '',
  };
}

// Listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_JOB') {
    const jobData = extractJobDetails();
    sendResponse({ success: true, data: jobData });
  }
  return true;
});
