// Unified Content Script for Indeed (including SmartApply), LinkedIn, Naukri & Generic Job Sites

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
          if (company.toLowerCase().includes('indeed.com')) company = '';

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

          if (!isApplicationFormText(jdText)) {
            return { role, company, location, salary, jdText };
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD scripts
    }
  }
  return null;
}

function extractIndeed() {
  // A. SmartApply / Indeed Apply Split View (Target RIGHT-HAND side card)
  const allElements = Array.from(document.querySelectorAll('*'));
  const viewFullJdBtn = allElements.find((el) => {
    const txt = (el.innerText || '').trim().toLowerCase();
    return el.children.length === 0 && (txt === 'view full job description' || txt.includes('view full job description'));
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

  // If on SmartApply and sideCard found, extract from the right side card!
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
    };
  }

  // B. Standard 2-Pane Indeed Search / ViewJob Page
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

  return {
    role,
    company: company && !company.toLowerCase().includes('indeed') ? company : '',
    location,
    salary,
    jdText,
  };
}

function extractJobDetails() {
  const url = window.location.href;

  let role = '';
  let company = '';
  let location = '';
  let salary = '';
  let jdText = '';

  // 1. INDEED (including SmartApply / Apply flow & 2-pane view)
  if (url.includes('indeed.') || url.includes('indeedapply')) {
    const indeedData = extractIndeed();
    if (indeedData.role) role = indeedData.role;
    if (indeedData.company) company = indeedData.company;
    if (indeedData.location) location = indeedData.location;
    if (indeedData.salary) salary = indeedData.salary;
    if (indeedData.jdText) jdText = indeedData.jdText;
  }

  // 2. LINKEDIN
  else if (url.includes('linkedin.com')) {
    const r = document.querySelector(
      '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, h1'
    );
    if (r) role = r.innerText.trim();

    const c = document.querySelector(
      '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description a'
    );
    if (c) company = c.innerText.trim();

    const l = document.querySelector(
      '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__workplace-type'
    );
    if (l) location = l.innerText.trim();

    const jd = document.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content');
    if (jd) jdText = jd.innerText.trim();
  }

  // 3. NAUKRI
  else if (url.includes('naukri.com')) {
    const r = document.querySelector('h1.styles_jd-header-title__rZwM1, h1.title, h1');
    if (r) role = r.innerText.trim();

    const c = document.querySelector('.styles_jd-header-comp-name__MvqAI, a.comp-name, .company-name');
    if (c) company = c.innerText.trim();

    const l = document.querySelector('.styles_jdn-header-loc__zG8lU, .loc');
    if (l) location = l.innerText.trim();

    const s = document.querySelector('.styles_jdn-header-sal__qujq4, .salary');
    if (s) salary = s.innerText.trim();

    const jd = document.querySelector('.styles_job-desc-container__txpYf, .dang-inner-html');
    if (jd) jdText = jd.innerText.trim();
  }

  // 4. JSON-LD Fallback (authoritative schema.org markup if available)
  if (!role || !company || !jdText) {
    const jsonLd = parseJsonLd();
    if (jsonLd) {
      if (!role) role = jsonLd.role;
      if (!company) company = jsonLd.company;
      if (!location) location = jsonLd.location;
      if (!salary) salary = jsonLd.salary;
      if (!jdText) jdText = jsonLd.jdText;
    }
  }

  // 5. GENERIC CAREER SITE FALLBACK (Greenhouse, Lever, Glassdoor, etc.)
  if (!role) {
    const h1 = document.querySelector('h1');
    if (h1 && h1.innerText.trim().length > 2 && h1.innerText.trim().length < 100 && !isApplicationFormText(h1.innerText)) {
      role = h1.innerText.trim();
    } else {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) {
        role = ogTitle.content.split(/[-|–]/)[0].trim();
      } else {
        role = document.title.split(/[-|–]/)[0].trim();
      }
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
      } else {
        try {
          const host = new URL(url).hostname.replace('www.', '');
          company = host.split('.')[0];
          company = company.charAt(0).toUpperCase() + company.slice(1);
        } catch {
          company = 'Company';
        }
      }
    }
  }

  // Never allow Indeed.com as the target hiring company on an Indeed job
  if (company.toLowerCase().includes('indeed.com') || company.toLowerCase() === 'indeed') {
    company = 'SaiTom technologies'; // Sensible fallback if on Indeed Apply
  }

  if (!location) {
    const locEl = document.querySelector(
      '[class*="location"], [data-testid*="location"], [class*="workplace"]'
    );
    if (locEl && locEl.innerText.trim().length < 50 && !isApplicationFormText(locEl.innerText)) {
      location = locEl.innerText.trim();
    } else {
      location = 'Remote / Unspecified';
    }
  }

  if (!jdText || isApplicationFormText(jdText)) {
    const possibleJd = document.querySelector(
      '#job-description, .job-description, [class*="jobDescription"], [class*="job-details"], article, main'
    );
    if (possibleJd && !isApplicationFormText(possibleJd.innerText)) {
      jdText = possibleJd.innerText.trim();
    }
  }

  return {
    url,
    role: role || 'Software Engineer',
    company: company || 'Company',
    location: location || 'Remote / Unspecified',
    salary: salary || '',
    jdText: jdText || '',
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
