(() => {
  if (window.__jcLoaded) return;
  window.__jcLoaded = true;

  const clean = t => (t || '').replace(/Promoted\b[^.;,\n]*/gi, '').replace(/\s{2,}/g, ' ').trim();
  const esc = s => Object.assign(document.createElement('div'), { textContent: s || '' }).innerHTML;
  const safeUrl = href => { try { const p = new URL(href).protocol; return p === 'https:' || p === 'http:' ? href.split('?')[0] : ''; } catch { return ''; } };
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  // ── LinkedIn Extraction ──
  function extractLinkedIn() {
    const title = clean($('.job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title a, h1.t-24')?.textContent);
    const company = clean($('.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name')?.textContent);
    const descEl = $('.job-details-jobs-unified-top-card__primary-description-without-tagline, .job-details-jobs-unified-top-card__primary-description-container');
    const location = clean(descEl?.querySelector('span')?.textContent);

    const allText = ($('.jobs-search__job-details')?.textContent || document.body.textContent);
    const salary = (allText.match(/\$[\d,]+[kK]?(?:\/yr|\/hour|\/mo)?(?:\s*[-–]\s*\$[\d,]+[kK]?(?:\/yr|\/hour|\/mo)?)?/) || [''])[0];
    const applicants = clean((allText.match(/(?:over\s+|be among the first\s+)?[\d,]+\s+applicants?/i) || [''])[0]);

    let hiringTeam = '', hiringTeamUrl = '';
    const htHeading = $$('h2, h3').find(h => h.textContent.includes('Meet the hiring team'));
    if (htHeading) {
      const p = htHeading.closest('section') || htHeading.parentElement;
      const nameEl = p?.querySelector('.jobs-poster__name a, a[href*="/in/"]');
      const titleEl = p?.querySelector('.jobs-poster__headline, .t-black--light');
      hiringTeam = clean(nameEl?.textContent);
      if (nameEl?.href) hiringTeamUrl = safeUrl(nameEl.href);
      if (titleEl) hiringTeam += ' - ' + clean(titleEl.textContent);
    }

    const workType = $$('.job-details-jobs-unified-top-card__job-insight span.ui-label')
      .map(s => clean(s.textContent)).filter(Boolean).join(', ');

    const insightText = $$('.job-details-jobs-unified-top-card__job-insight, .jobs-premium-applicant-insights li, .job-details-how-you-match__skills-item, .jobs-description__salary-compensation-insights li')
      .map(el => el.textContent).join(' ') + ' ' + allText;
    const education = clean((insightText.match(/(?:Bachelor|Master|Associate|Doctoral|PhD|High school|MBA|Bachelor's|Master's|Associate's)[^.;,\n]*/i) || [''])[0]);
    const seniority = clean((insightText.match(/(?:Entry[\s-]?level|Associate|Mid[\s-]?Senior[\s-]?level|Senior[\s-]?level|Director|Executive|Internship|Not Applicable)/i) || [''])[0]);

    const bHead = $$('h3').find(h => h.textContent.toLowerCase().includes('featured benefits'));
    const benefits = bHead ? $$('li', bHead.closest('div, section') || bHead.parentElement).map(li => clean(li.textContent)).filter(Boolean).join(', ') : '';

    return { title, company, location, salary, applicants, education, seniority, benefits, hiringTeam, hiringTeamUrl, workType, source: 'LinkedIn' };
  }

  // ── Indeed Extraction ──
  function extractIndeed() {
    const title = clean($('h2.jobsearch-JobInfoHeader-title, .jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent);
    const company = clean($('[data-testid="inlineHeader-companyName"] a, .jobsearch-InlineCompanyRating a, .css-1h46us2')?.textContent);
    const location = clean($('[data-testid="inlineHeader-companyLocation"], [data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle .css-1restlb')?.textContent);
    const salary = ($('#salaryInfoAndJobType .css-1g1y608, .jobsearch-JobMetadataHeader-item, [data-testid="attribute_snippet_testid"]')?.textContent || '').trim();

    let hiringTeam = '', hiringTeamUrl = '';
    const hireEl = $('.jobsearch-HiringInsights-entry');
    if (hireEl) {
      hiringTeam = clean(hireEl.textContent);
      const link = hireEl.querySelector('a[href]');
      if (link) hiringTeamUrl = safeUrl(link.href);
    }

    const applicants = clean((document.body.textContent.match(/(?:over\s+|be among the first\s+)?[\d,]+\s+applicants?/i) || [''])[0]);

    return { title, company, location, salary, applicants, education: '', seniority: '', benefits: '', hiringTeam, hiringTeamUrl, workType: '', source: 'Indeed' };
  }

  function getJob() {
    const h = location.hostname;
    const data = h.includes('linkedin.com') ? extractLinkedIn() : h.includes('indeed.com') ? extractIndeed() : null;
    return data && { id: crypto.randomUUID(), ...data, url: location.href, date: new Date().toISOString().split('T')[0] };
  }

  // ── Save (serialized to prevent race conditions) ──
  let saveQueue = Promise.resolve();
  function saveJob(status = 'Applied') {
    return saveQueue = saveQueue.then(async () => {
      const job = getJob();
      if (!job?.title) return 'none';
      job.status = status;
      const { jobs = [] } = await chrome.storage.local.get('jobs');
      if (jobs.some(j => j.url === job.url || (j.title === job.title && j.company === job.company))) return 'exists';
      jobs.push(job);
      await chrome.storage.local.set({ jobs });
      return 'saved';
    });
  }

  function flashBtn(btn, text, bg) {
    btn.textContent = text;
    btn.style.background = bg;
    setTimeout(() => { btn.textContent = 'Save Job'; btn.style.background = '#2563eb'; }, 2000);
  }

  // ── Auto-save on submit/apply clicks ──
  function isSubmitBtn(el) {
    if (!el || el.tagName !== 'BUTTON') return false;
    const t = (el.textContent + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
    return t.includes('submit application') || t.includes('submit your application') ||
      ((t.includes('apply now') || t.includes('submit')) && el.type === 'submit');
  }

  function isSaveBtn(el) {
    if (!el || el.tagName !== 'BUTTON') return false;
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    if (aria.startsWith('save ') && aria.includes(' at ')) return true;
    return el.textContent.trim().toLowerCase() === 'save' &&
      el.closest('.jobs-apply-button--top-card, .job-details-jobs-unified-top-card__container');
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    const status = isSubmitBtn(btn) ? 'Applied' : isSaveBtn(btn) ? 'Saved' : null;
    if (status) setTimeout(async () => {
      const r = await saveJob(status);
      const b = $('#jt-save-btn');
      if (b && r === 'saved') flashBtn(b, status === 'Saved' ? 'Bookmarked!' : 'Auto-saved!', '#16a34a');
    }, 500);
  }, true);

  // ── Injected Save Button ──
  function injectSaveButton() {
    if ($('#jt-save-btn')) return true;
    const btn = Object.assign(document.createElement('button'), { id: 'jt-save-btn', textContent: 'Save Job' });
    btn.addEventListener('click', async () => {
      if (!getJob()?.title) return flashBtn(btn, 'No job found', '#ef4444');
      const r = await saveJob('Applied');
      flashBtn(btn, r === 'exists' ? 'Already saved' : r === 'saved' ? 'Saved!' : 'Error', r === 'exists' ? '#f59e0b' : r === 'saved' ? '#16a34a' : '#ef4444');
    });
    document.body.appendChild(btn);
    return true;
  }

  let timer;
  const obs = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (injectSaveButton()) obs.disconnect(); }, 300);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectSaveButton, 1500);

  // ── Sidebar ──
  function toggleSidebar() {
    const existing = $('#jt-sidebar');
    if (existing) { existing.classList.toggle('jt-sidebar-open'); return; }
    const sidebar = Object.assign(document.createElement('div'), { id: 'jt-sidebar' });
    sidebar.innerHTML = '<div id="jt-sidebar-header"><span>JobCruncher</span><button id="jt-sidebar-close">\u00D7</button></div><div id="jt-sidebar-list"></div>';
    document.body.appendChild(sidebar);
    $('#jt-sidebar-close').addEventListener('click', () => sidebar.classList.remove('jt-sidebar-open'));
    sidebar.offsetHeight;
    sidebar.classList.add('jt-sidebar-open');
    const list = $('#jt-sidebar-list');
    renderSidebar(list);
    chrome.storage.onChanged.addListener(() => renderSidebar(list));
  }

  async function renderSidebar(el) {
    const { jobs = [] } = await chrome.storage.local.get('jobs');
    if (!jobs.length) { el.innerHTML = '<div class="jt-sb-empty">No jobs saved yet</div>'; return; }
    const nl = v => v || '<span class="jt-sb-na">Not listed</span>';
    const f = (l, v) => `<div class="jt-sb-field"><span class="jt-sb-label">${l}</span>${nl(v)}</div>`;
    el.innerHTML = jobs.map(j => {
      const sal = j.salary ? `<span class="jt-sb-salary">${esc(j.salary)}</span>` : '';
      const ht = j.hiringTeam ? (j.hiringTeamUrl ? `<a href="${esc(j.hiringTeamUrl)}" target="_blank" class="jt-sb-link">${esc(j.hiringTeam)}</a>` : esc(j.hiringTeam)) : '';
      const ben = j.benefits ? `<details class="jt-sb-benefits"><summary>Benefits</summary><ul>${j.benefits.split(', ').map(b => `<li>${esc(b)}</li>`).join('')}</ul></details>` : '';
      return `<div class="jt-sb-card">
        <div class="jt-sb-title"><a href="${esc(j.url)}" target="_blank">${esc(j.title) || 'Untitled'}</a></div>
        <div class="jt-sb-sub">${esc(j.company) || 'Unknown'} \u00B7 ${esc(j.location) || 'N/A'}</div>
        <div class="jt-sb-fields">${f('Salary', sal)}${f('Applicants', esc(j.applicants))}${f('Experience', esc(j.seniority))}${f('Education', esc(j.education))}${f('Work Type', esc(j.workType))}${f('Hiring Contact', ht)}</div>
        ${ben}<div class="jt-sb-status"><span class="jt-sb-label">Status</span> ${esc(j.status)}</div>
      </div>`;
    }).join('');
  }

  chrome.runtime.onMessage.addListener(msg => { if (msg.action === 'toggleSidebar') toggleSidebar(); });
})();
