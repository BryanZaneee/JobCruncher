(() => {
  function cleanText(text) {
    return (text || '')
      .replace(/\bPromoted by hirer\b/gi, '')
      .replace(/\bPromoted\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function extractLinkedInJob() {
    const title = cleanText(document.querySelector(
      '.job-details-jobs-unified-top-card__job-title h1, ' +
      '.job-details-jobs-unified-top-card__job-title a, ' +
      'h1.t-24'
    )?.textContent?.trim());

    const company = cleanText(document.querySelector(
      '.job-details-jobs-unified-top-card__company-name a, ' +
      '.job-details-jobs-unified-top-card__company-name'
    )?.textContent?.trim());

    const descContainer = document.querySelector(
      '.job-details-jobs-unified-top-card__primary-description-without-tagline, ' +
      '.job-details-jobs-unified-top-card__primary-description-container'
    );
    const spans = descContainer
      ? Array.from(descContainer.querySelectorAll('span')).map(s => s.textContent.trim())
      : [];
    const location = cleanText(spans[0]);

    const rightPanel = document.querySelector('.jobs-search__job-details');
    const allText = rightPanel?.textContent || document.body.textContent;
    const salaryMatch = allText.match(
      /\$[\d,]+[kK]?(?:\/yr|\/hour|\/mo)?(?:\s*[-–]\s*\$[\d,]+[kK]?(?:\/yr|\/hour|\/mo)?)?/
    );
    const salary = salaryMatch ? salaryMatch[0] : '';

    // Extract applicant count (e.g. "200 applicants", "Over 100 applicants", "Be among the first 25 applicants")
    const applicantMatch = allText.match(
      /(?:over\s+|be among the first\s+)?([\d,]+)\s+applicants?/i
    );
    let applicants = applicantMatch ? applicantMatch[0].trim() : '';
    // Strip any trailing "Promoted" text that LinkedIn concatenates without whitespace
    applicants = applicants.replace(/Promoted.*$/i, '').trim();

    const hiringTeamSection = Array.from(document.querySelectorAll('h2, h3'))
      .find(h => h.textContent.includes('Meet the hiring team'));
    let hiringTeam = '';
    let hiringTeamUrl = '';
    if (hiringTeamSection) {
      const parent = hiringTeamSection.closest('section') || hiringTeamSection.parentElement;
      const nameEl = parent?.querySelector('.jobs-poster__name a, a[href*="/in/"]');
      const titleEl = parent?.querySelector('.jobs-poster__headline, .t-black--light');
      hiringTeam = cleanText(nameEl?.textContent?.trim());
      if (nameEl?.href) {
        hiringTeamUrl = nameEl.href.split('?')[0];
      }
      if (titleEl) hiringTeam += ' - ' + cleanText(titleEl.textContent.trim());
    }

    const tags = Array.from(
      document.querySelectorAll('.job-details-jobs-unified-top-card__job-insight span.ui-label')
    ).map(s => cleanText(s.textContent.trim())).filter(Boolean);
    const workType = tags.join(', ');

    // LinkedIn Premium insights: education level and seniority
    // These appear in the job insights section, often as list items or spans
    const insightEls = Array.from(document.querySelectorAll(
      '.job-details-jobs-unified-top-card__job-insight, ' +
      '.jobs-premium-applicant-insights li, ' +
      '.job-details-how-you-match__skills-item, ' +
      '.jobs-description__salary-compensation-insights li'
    ));
    const insightText = insightEls.map(el => el.textContent.trim()).join(' ');
    // Also check the full panel text for these
    const fullInsightText = insightText + ' ' + allText;

    const educationMatch = fullInsightText.match(
      /(?:Bachelor|Master|Associate|Doctoral|PhD|High school|MBA|Bachelor's|Master's|Associate's)[^.;,\n]*/i
    );
    const education = educationMatch ? cleanText(educationMatch[0]) : '';

    const seniorityMatch = fullInsightText.match(
      /(?:Entry[\s-]?level|Associate|Mid[\s-]?Senior[\s-]?level|Senior[\s-]?level|Director|Executive|Internship|Not Applicable)/i
    );
    const seniority = seniorityMatch ? cleanText(seniorityMatch[0]) : '';

    // Extract featured benefits
    // LinkedIn shows a "Featured benefits" h3 heading followed by a list of benefits
    const benefitsHeading = Array.from(document.querySelectorAll('h3'))
      .find(h => h.textContent.trim().toLowerCase().includes('featured benefits'));
    let benefits = '';
    if (benefitsHeading) {
      const benefitsParent = benefitsHeading.closest('div, section') || benefitsHeading.parentElement;
      const benefitItems = Array.from(benefitsParent.querySelectorAll('li'))
        .map(li => cleanText(li.textContent))
        .filter(Boolean);
      benefits = benefitItems.join(', ');
    }

    return {
      id: crypto.randomUUID(),
      title,
      company,
      location,
      salary,
      applicants,
      education,
      seniority,
      benefits,
      hiringTeam,
      hiringTeamUrl,
      workType,
      url: window.location.href,
      source: 'LinkedIn',
      date: new Date().toISOString().split('T')[0],
    };
  }

  function extractIndeedJob() {
    const title = cleanText(document.querySelector(
      'h2.jobsearch-JobInfoHeader-title, ' +
      '.jobsearch-JobInfoHeader-title, ' +
      'h1[data-testid="jobsearch-JobInfoHeader-title"]'
    )?.textContent?.trim());

    const company = cleanText(document.querySelector(
      '[data-testid="inlineHeader-companyName"] a, ' +
      '.jobsearch-InlineCompanyRating a, ' +
      '.css-1h46us2'
    )?.textContent?.trim());

    const location = cleanText(document.querySelector(
      '[data-testid="inlineHeader-companyLocation"], ' +
      '[data-testid="job-location"], ' +
      '.jobsearch-JobInfoHeader-subtitle .css-1restlb'
    )?.textContent?.trim());

    const salaryEl = document.querySelector(
      '#salaryInfoAndJobType .css-1g1y608, ' +
      '.jobsearch-JobMetadataHeader-item, ' +
      '[data-testid="attribute_snippet_testid"]'
    );
    const salary = salaryEl?.textContent?.trim() || '';

    let hiringTeam = '';
    let hiringTeamUrl = '';
    const hireEl = document.querySelector('.jobsearch-HiringInsights-entry');
    if (hireEl) {
      hiringTeam = cleanText(hireEl.textContent.trim());
      const hireLink = hireEl.querySelector('a[href]');
      if (hireLink) hiringTeamUrl = hireLink.href.split('?')[0];
    }

    // Indeed sometimes shows applicant count in hiring insights
    const pageText = document.body.textContent;
    const applicantMatch = pageText.match(/(?:over\s+|be among the first\s+)?([\d,]+)\s+applicants?/i);
    let applicants = applicantMatch ? applicantMatch[0].trim() : '';
    applicants = applicants.replace(/Promoted.*$/i, '').trim();

    return {
      id: crypto.randomUUID(),
      title,
      company,
      location,
      salary,
      applicants,
      education: '',
      seniority: '',
      benefits: '',
      hiringTeam,
      hiringTeamUrl,
      workType: '',
      url: window.location.href,
      source: 'Indeed',
      date: new Date().toISOString().split('T')[0],
    };
  }

  function getJobData() {
    if (window.location.hostname.includes('linkedin.com')) return extractLinkedInJob();
    if (window.location.hostname.includes('indeed.com')) return extractIndeedJob();
    return null;
  }

  async function autoSaveJob(status = 'Applied') {
    const job = getJobData();
    if (!job || !job.title) return;

    job.status = status;

    try {
      const { jobs = [] } = await chrome.storage.local.get('jobs');
      const exists = jobs.some(j => j.url === job.url || (j.title === job.title && j.company === job.company));
      if (exists) return;
      jobs.push(job);
      await chrome.storage.local.set({ jobs });

      // Flash the save button to confirm
      const btn = document.getElementById('jt-save-btn');
      if (btn) {
        const label = status === 'Saved' ? 'Bookmarked!' : 'Auto-saved!';
        btn.textContent = label;
        btn.style.background = '#16a34a';
        setTimeout(() => { btn.textContent = 'Save Job'; btn.style.background = '#2563eb'; }, 2500);
      }
    } catch {}
  }

  function isSubmitButton(el) {
    if (!el || el.tagName !== 'BUTTON') return false;
    const text = el.textContent.trim().toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const combined = text + ' ' + ariaLabel;

    // LinkedIn Easy Apply final submit
    if (combined.includes('submit application')) return true;
    // Indeed apply submit
    if (combined.includes('submit your application')) return true;
    if (combined.includes('apply now') && el.type === 'submit') return true;
    // Indeed "Continue" on final step often submits
    if (combined.includes('submit') && el.type === 'submit') return true;

    return false;
  }

  function isLinkedInSaveButton(el) {
    if (!el || el.tagName !== 'BUTTON') return false;
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    // LinkedIn's native Save button: "Save [Job Title] at [Company]"
    if (ariaLabel.startsWith('save ') && ariaLabel.includes(' at ')) return true;
    // Also check for the button text being exactly "Save"
    const text = el.textContent.trim().toLowerCase();
    if (text === 'save' && el.closest('.jobs-apply-button--top-card, .job-details-jobs-unified-top-card__container')) return true;
    return false;
  }

  // Listen for clicks on submit/apply and save buttons via event capturing
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (isSubmitButton(btn)) {
      setTimeout(() => autoSaveJob('Applied'), 500);
    } else if (isLinkedInSaveButton(btn)) {
      setTimeout(() => autoSaveJob('Saved'), 500);
    }
  }, true);

  function injectSaveButton() {
    if (document.getElementById('jt-save-btn')) return true;

    const btn = document.createElement('button');
    btn.id = 'jt-save-btn';
    btn.textContent = 'Save Job';

    btn.addEventListener('click', async () => {
      const job = getJobData();
      if (!job || !job.title) {
        btn.textContent = 'No job found';
        setTimeout(() => { btn.textContent = 'Save Job'; }, 2000);
        return;
      }

      job.status = 'Applied';

      try {
        const { jobs = [] } = await chrome.storage.local.get('jobs');
        const exists = jobs.some(j => j.url === job.url || (j.title === job.title && j.company === job.company));
        if (exists) {
          btn.textContent = 'Already saved';
          btn.style.background = '#f59e0b';
          setTimeout(() => { btn.textContent = 'Save Job'; btn.style.background = '#2563eb'; }, 2000);
          return;
        }
        jobs.push(job);
        await chrome.storage.local.set({ jobs });
        btn.textContent = 'Saved!';
        btn.style.background = '#16a34a';
        setTimeout(() => { btn.textContent = 'Save Job'; btn.style.background = '#2563eb'; }, 2000);
      } catch (err) {
        btn.textContent = 'Error saving';
        btn.style.background = '#ef4444';
        setTimeout(() => { btn.textContent = 'Save Job'; btn.style.background = '#2563eb'; }, 2000);
      }
    });

    document.body.appendChild(btn);
    return true;
  }

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const injected = injectSaveButton();
      if (injected) observer.disconnect();
    }, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectSaveButton, 1500);

  // ── Sidebar ──
  function toggleSidebar() {
    const existing = document.getElementById('jt-sidebar');
    if (existing) {
      existing.classList.toggle('jt-sidebar-open');
      return;
    }

    const sidebar = document.createElement('div');
    sidebar.id = 'jt-sidebar';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'jt-sidebar-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => sidebar.classList.remove('jt-sidebar-open'));

    const header = document.createElement('div');
    header.id = 'jt-sidebar-header';
    header.innerHTML = '<span>JobCruncher</span>';
    header.appendChild(closeBtn);

    const listContainer = document.createElement('div');
    listContainer.id = 'jt-sidebar-list';

    sidebar.appendChild(header);
    sidebar.appendChild(listContainer);
    document.body.appendChild(sidebar);

    // Force reflow then open
    sidebar.offsetHeight;
    sidebar.classList.add('jt-sidebar-open');

    renderSidebar(listContainer);

    // Re-render when storage changes
    chrome.storage.onChanged.addListener(() => renderSidebar(listContainer));
  }

  async function renderSidebar(container) {
    const { jobs = [] } = await chrome.storage.local.get('jobs');

    if (jobs.length === 0) {
      container.innerHTML = '<div style="padding:40px 16px;text-align:center;color:#a8a29e;font-size:13px;">No jobs saved yet</div>';
      return;
    }

    const nl = (v) => v || '<span style="color:#a8a29e;font-style:italic">Not listed</span>';
    const esc = (s) => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };

    container.innerHTML = jobs.map(job => {
      const title = esc(job.title) || 'Untitled';
      const company = esc(job.company) || 'Unknown';
      const location = esc(job.location) || 'N/A';
      const salary = job.salary ? `<span style="color:#16a34a;font-weight:600">${esc(job.salary)}</span>` : nl('');
      const applicants = nl(esc((job.applicants || '').replace(/Promoted.*$/i, '').trim()));
      const seniority = nl(esc(job.seniority));
      const education = nl(esc(job.education));
      const workType = nl(esc(job.workType));
      const hiringTeam = job.hiringTeam
        ? (job.hiringTeamUrl ? `<a href="${esc(job.hiringTeamUrl)}" target="_blank" style="color:#2563eb">${esc(job.hiringTeam)}</a>` : esc(job.hiringTeam))
        : nl('');
      const benefits = job.benefits
        ? `<details style="margin-top:4px;border:1px solid #e7e5e4;border-radius:6px;overflow:hidden">
            <summary style="padding:5px 8px;font-size:11px;font-weight:600;cursor:pointer;background:#fafaf9;list-style:none;user-select:none">Benefits</summary>
            <ul style="padding:4px 8px 6px 22px;margin:0;font-size:11px;color:#57534e;line-height:1.6">${job.benefits.split(', ').map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          </details>`
        : '';

      return `<div class="jt-sb-card">
        <div class="jt-sb-title"><a href="${esc(job.url)}" target="_blank">${title}</a></div>
        <div class="jt-sb-sub">${company} · ${location}</div>
        <div class="jt-sb-fields">
          <div class="jt-sb-field"><span class="jt-sb-label">Salary</span>${salary}</div>
          <div class="jt-sb-field"><span class="jt-sb-label">Applicants</span>${applicants}</div>
          <div class="jt-sb-field"><span class="jt-sb-label">Experience</span>${seniority}</div>
          <div class="jt-sb-field"><span class="jt-sb-label">Education</span>${education}</div>
          <div class="jt-sb-field"><span class="jt-sb-label">Work Type</span>${workType}</div>
          <div class="jt-sb-field"><span class="jt-sb-label">Hiring Contact</span>${hiringTeam}</div>
        </div>
        ${benefits}
        <div class="jt-sb-status">
          <span class="jt-sb-label">Status</span>
          <span style="color:#44403c;font-size:12px">${esc(job.status)}</span>
        </div>
      </div>`;
    }).join('');
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggleSidebar') toggleSidebar();
  });
})();
