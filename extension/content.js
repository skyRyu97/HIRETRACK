// ============================================================================
// HIRETRACK AI - 4-LAYER CASCADE JOB SCRAPING ENGINE
// Layer 1: Schema.org JSON-LD (JobPosting)
// Layer 2: Dedicated Platform Adapters (Indeed SmartApply, ViewJob, LinkedIn, Naukri, ATS)
// Layer 3: URL / Referrer De-referencing (Resolving permanent job links)
// Layer 4: Semantic Readability / Clean DOM Extractor (For Universal AI Fallback)
// ============================================================================

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function isApplicationFormText(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('add your contact information') ||
    lower.includes('fields marked with (*) are required') ||
    (lower.includes('first name') && lower.includes('last name') && lower.includes('phone number'))
  );
}

// ----------------------------------------------------------------------------
// LAYER 1: SCHEMA.ORG JSON-LD EXTRACTOR
// ----------------------------------------------------------------------------
function parseJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.innerText);
      const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      for (const item of items) {
        if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
          const role = item.title || item.name || '';
          let company = item.hiringOrganization?.name || '';
          if (company.toLowerCase().includes('indeed.com') || company.toLowerCase() === 'indeed') {
            company = '';
          }

          let location = '';
          if (item.jobLocation) {
            const locObj = Array.isArray(item.jobLocation) ? item.jobLocation[0] : item.jobLocation;
            if (locObj?.address) {
              const addr = locObj.address;
              location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
                .filter(Boolean)
                .join(', ');
            }
          }
          let salary = '';
          if (item.baseSalary) {
            const sal = item.baseSalary;
            if (sal.value) {
              const val = sal.value;
              salary = `${sal.currency || ''} ${val.minValue || val.value || ''} - ${val.maxValue || ''} / ${sal.unitText || 'yr'}`.trim();
            }
          }
          const jdText = item.description ? stripHtml(item.description).trim() : '';

          if (!isApplicationFormText(jdText) && (role || company)) {
            return { role, company, location, salary, jdText, layer: 'L1:JSON-LD' };
          }
        }
      }
    } catch {
      // Ignore invalid JSON-LD scripts
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// LAYER 2: PLATFORM ADAPTERS
// ----------------------------------------------------------------------------

// Adapter 2A: Indeed SmartApply / Apply Split View (Targets Right-hand Card)
function extractIndeedSmartApply() {
  const allElements = Array.from(document.querySelectorAll('*'));
  const viewFullJdBtn = allElements.find((el) => {
    const txt = (el.innerText || '').trim().toLowerCase();
    return el.children.length === 0 && txt.includes('view full job description');
  });

  let sideCard = null;
  if (viewFullJdBtn) {
    let p = viewFullJdBtn.parentElement;
    for (let i = 0; i < 6 && p && p !== document.body; i++) {
      if (p.innerText && p.innerText.length > 80 && !p.querySelector('input[type="text"]')) {
        sideCard = p;
        break;
      }
      p = p.parentElement;
    }
  }

  if (sideCard) {
    const titleEl = sideCard.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"], strong');
    const role = titleEl ? titleEl.innerText.trim() : '';

    const lines = sideCard.innerText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const titleIdx = lines.findIndex((l) => role && l.includes(role));
    const subtitle = titleIdx !== -1 && lines[titleIdx + 1] ? lines[titleIdx + 1] : lines[1] || '';

    let company = '';
    let location = '';

    if (subtitle.includes(' - ')) {
      const parts = subtitle.split(' - ');
      company = parts[0].trim();
      location = parts.slice(1).join(' - ').trim();
    } else if (subtitle.includes('·')) {
      const parts = subtitle.split('·');
      company = parts[0].trim();
      location = parts.slice(1).join('·').trim();
    } else if (subtitle.includes(',')) {
      const parts = subtitle.split(',');
      company = parts[0].trim();
      location = parts.slice(1).join(',').trim();
    } else {
      company = subtitle;
    }

    let jdText = sideCard.innerText
      .replace(role, '')
      .replace(subtitle, '')
      .replace(/View full job description/gi, '')
      .trim();

    return {
      role,
      company: company && !company.toLowerCase().includes('indeed') ? company : '',
      location,
      salary: '',
      jdText,
      layer: 'L2:IndeedSmartApply',
    };
  }

  return null;
}

// Adapter 2B: Indeed Standard View / 2-Pane Search
function extractIndeedViewJob() {
  const rightPane =
    document.querySelector(
      '#jobsearch-ViewjobPaneWrapper, .jobsearch-JobComponent, #viewJobSSRRoot, [data-testid="viewJobWrapper"]'
    ) || document;

  const roleEl = rightPane.querySelector(
    'h1.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"], [data-testid="simpler-jobTitle"], h1'
  );
  const role = roleEl ? roleEl.innerText.trim() : '';

  const compEl = rightPane.querySelector(
    '[data-testid="inlineHeader-companyName"], [data-company-name="true"], .jobsearch-CompanyInfoContainer a, .jobsearch-InlineCompanyRating-companyHeader a, .jobsearch-InlineCompanyRating-companyHeader'
  );
  let company = compEl ? compEl.innerText.trim() : '';

  const locEl = rightPane.querySelector(
    '[data-testid="inlineHeader-companyLocation"], [data-testid="job-location"], div[data-testid="jobsearch-JobInfoHeader-companyLocation"], .jobsearch-JobInfoHeader-companyLocation'
  );
  let location = locEl ? locEl.innerText.trim() : '';

  const salEl = rightPane.querySelector('#salaryInfoAndJobType, [data-testid="attribute_snippets_test_id"]');
  let salary = salEl ? salEl.innerText.trim() : '';

  const jdEl = rightPane.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
  let jdText = jdEl ? jdEl.innerText.trim() : '';

  if (role || jdText) {
    return {
      role,
      company: company && !company.toLowerCase().includes('indeed') ? company : '',
      location,
      salary,
      jdText,
      layer: 'L2:IndeedViewJob',
    };
  }
  return null;
}

// Adapter 2C: LinkedIn Adapter
function extractLinkedIn() {
  const r = document.querySelector(
    '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, h1'
  );
  const role = r ? r.innerText.trim() : '';

  const c = document.querySelector(
    '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description a'
  );
  const company = c ? c.innerText.trim() : '';

  const l = document.querySelector(
    '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__workplace-type'
  );
  const location = l ? l.innerText.trim() : '';

  const jd = document.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content');
  const jdText = jd ? jd.innerText.trim() : '';

  if (role || jdText) {
    return { role, company, location, salary: '', jdText, layer: 'L2:LinkedIn' };
  }
  return null;
}

// Adapter 2D: Naukri Adapter
function extractNaukri() {
  const r = document.querySelector('h1.styles_jd-header-title__rZwM1, h1.title, h1');
  const role = r ? r.innerText.trim() : '';

  const c = document.querySelector('.styles_jd-header-comp-name__MvqAI, a.comp-name, .company-name');
  const company = c ? c.innerText.trim() : '';

  const l = document.querySelector('.styles_jdn-header-loc__zG8lU, .loc');
  const location = l ? l.innerText.trim() : '';

  const s = document.querySelector('.styles_jdn-header-sal__qujq4, .salary');
  const salary = s ? s.innerText.trim() : '';

  const jd = document.querySelector('.styles_job-desc-container__txpYf, .dang-inner-html');
  const jdText = jd ? jd.innerText.trim() : '';

  if (role || jdText) {
    return { role, company, location, salary, jdText, layer: 'L2:Naukri' };
  }
  return null;
}

// Adapter 2E: ATS Platforms (Greenhouse, Lever, Ashby, Workday)
function extractAts() {
  const ghTitle = document.querySelector('.app-title, #header .title, h1.app-title');
  const ghComp = document.querySelector('.company-name');
  const ghJd = document.querySelector('#content, #app_body');

  if (ghTitle && ghJd) {
    return {
      role: ghTitle.innerText.trim(),
      company: ghComp ? ghComp.innerText.trim() : '',
      location: '',
      salary: '',
      jdText: ghJd.innerText.trim(),
      layer: 'L2:Greenhouse',
    };
  }

  const leverTitle = document.querySelector('.posting-header h2, .posting-headline h2');
  const leverJd = document.querySelector('.posting-page, .section-wrapper');
  if (leverTitle && leverJd) {
    return {
      role: leverTitle.innerText.trim(),
      company: '',
      location: '',
      salary: '',
      jdText: leverJd.innerText.trim(),
      layer: 'L2:Lever',
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// LAYER 3: URL DE-REFERENCING (PERMANENT URL RESOLVER)
// ----------------------------------------------------------------------------
function resolveCanonicalJobUrl(currentUrl) {
  try {
    const parsed = new URL(currentUrl);

    // Indeed de-referencing (?jk=xxxx or ?vjk=xxxx)
    const jk = parsed.searchParams.get('jk') || parsed.searchParams.get('vjk');
    if (jk && (parsed.hostname.includes('indeed.com') || parsed.hostname.includes('indeedapply'))) {
      return `https://${parsed.hostname.replace('smartapply.', 'www.')}/viewjob?jk=${jk}`;
    }

    // LinkedIn de-referencing (?currentJobId=xxxx)
    const liJobId = parsed.searchParams.get('currentJobId');
    if (liJobId && parsed.hostname.includes('linkedin.com')) {
      return `https://www.linkedin.com/jobs/view/${liJobId}`;
    }
  } catch {
    // ignore
  }
  return currentUrl;
}

// ----------------------------------------------------------------------------
// LAYER 4: READABILITY DOM CLEANER (FOR UNIVERSAL AI FALLBACK)
// ----------------------------------------------------------------------------
function getCleanPageText() {
  const clone = document.body.cloneNode(true);

  // Strip noise elements
  const noise = clone.querySelectorAll(
    'script, style, noscript, svg, nav, footer, header, form, input, button, select, textarea, [class*="cookie"], [class*="modal"], [class*="banner"]'
  );
  noise.forEach((el) => el.remove());

  // Return clean, compact text
  return (clone.innerText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .slice(0, 15000);
}

// ----------------------------------------------------------------------------
// CASCADE ORCHESTRATOR
// ----------------------------------------------------------------------------
function extractJobDetails() {
  const rawUrl = window.location.href;
  const canonicalUrl = resolveCanonicalJobUrl(rawUrl);

  let result = null;

  // 1. Layer 2: Platform Adapters (Preferred when on known domains)
  if (rawUrl.includes('smartapply.indeed.com') || rawUrl.includes('indeedapply')) {
    result = extractIndeedSmartApply();
  } else if (rawUrl.includes('indeed.')) {
    result = extractIndeedSmartApply() || extractIndeedViewJob();
  } else if (rawUrl.includes('linkedin.com')) {
    result = extractLinkedIn();
  } else if (rawUrl.includes('naukri.com')) {
    result = extractNaukri();
  } else if (
    rawUrl.includes('greenhouse.io') ||
    rawUrl.includes('lever.co') ||
    rawUrl.includes('ashbyhq.com')
  ) {
    result = extractAts();
  }

  // 2. Layer 1: JSON-LD Fallback
  if (!result || !result.role || !result.jdText) {
    const jsonLd = parseJsonLd();
    if (jsonLd) {
      result = {
        role: result?.role || jsonLd.role,
        company: result?.company || jsonLd.company,
        location: result?.location || jsonLd.location,
        salary: result?.salary || jsonLd.salary,
        jdText: result?.jdText || jsonLd.jdText,
        layer: jsonLd.layer,
      };
    }
  }

  // 3. Fallback to clean semantic elements if still missing fields
  let role = result?.role || '';
  let company = result?.company || '';
  let location = result?.location || 'Remote / Unspecified';
  let salary = result?.salary || '';
  let jdText = result?.jdText || '';

  if (!role) {
    const h1 = document.querySelector('h1');
    if (h1 && !isApplicationFormText(h1.innerText)) {
      role = h1.innerText.trim();
    } else {
      role = document.title.split(/[-|–]/)[0].trim();
    }
  }

  if (!company) {
    const ogSite = document.querySelector('meta[property="og:site_name"]');
    if (ogSite && ogSite.content && !ogSite.content.toLowerCase().includes('indeed')) {
      company = ogSite.content.trim();
    } else {
      const titleParts = document.title.split(/[-|–]/);
      if (titleParts.length > 1) {
        company = titleParts[titleParts.length - 1].trim();
      }
    }
  }

  // Always supply cleaned DOM text for Layer 4 AI fallback if JD is short/missing
  const cleanDomText = getCleanPageText();

  return {
    url: canonicalUrl,
    role: role || 'Software Engineer',
    company: company && !company.toLowerCase().includes('indeed') ? company : 'Company',
    location: location || 'Remote / Unspecified',
    salary: salary || '',
    jdText: !isApplicationFormText(jdText) ? jdText : '',
    cleanDomText,
    layer: result?.layer || 'L4:Heuristic',
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_JOB') {
    const jobData = extractJobDetails();
    sendResponse({ success: true, data: jobData });
  }
  return true;
});
