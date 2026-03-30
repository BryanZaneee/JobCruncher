const STATUS_OPTIONS = ['Applied', 'Saved', 'Contacted', 'No Response', 'Interviewed', 'Offer', 'Rejected'];
const LINKEDIN_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#0A66C2"/><path d="M7.5 10.5v6M7.5 7.5v.01M10.5 16.5v-3.75c0-1.5 1.5-1.5 1.5-1.5s1.5 0 1.5 1.5v3.75M10.5 10.5v6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const INDEED_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#003A9B"/><path d="M13.5 5c-1.1 0-2 .7-2 1.5S12.4 8 13.5 8s2-.7 2-1.5S14.6 5 13.5 5zm-1.5 5v8h3v-8h-3z" fill="#fff"/></svg>';

const esc = s => Object.assign(document.createElement('div'), { textContent: s || '' }).innerHTML;

function timeSince(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((new Date() - new Date(dateStr + 'T00:00:00')) / 864e5);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  if (days < 30) return w === 1 ? '1 week ago' : `${w} weeks ago`;
  const m = Math.floor(days / 30);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}

function parseSalary(s) {
  return parseInt((s || '').match(/\$?([\d,]+)/)?.[1]?.replace(/,/g, '') || '0', 10);
}

const SORT_FNS = {
  'newest':     (a, b) => (b.date || '').localeCompare(a.date || ''),
  'oldest':     (a, b) => (a.date || '').localeCompare(b.date || ''),
  'salary-desc':(a, b) => parseSalary(b.salary) - parseSalary(a.salary),
  'salary-asc': (a, b) => parseSalary(a.salary) - parseSalary(b.salary),
  'alpha-az':   (a, b) => (a.title || '').localeCompare(b.title || ''),
  'alpha-za':   (a, b) => (b.title || '').localeCompare(a.title || ''),
  'company-az': (a, b) => (a.company || '').localeCompare(b.company || ''),
  'company-za': (a, b) => (b.company || '').localeCompare(a.company || ''),
};

const loadJobs = async () => (await chrome.storage.local.get('jobs')).jobs || [];
const saveJobs = jobs => chrome.storage.local.set({ jobs });

function renderJobs(jobs) {
  const list = document.getElementById('jobList');
  const sortBy = document.getElementById('sortSelect').value;
  const srcFilter = document.getElementById('sourceFilter').value;

  document.getElementById('jobCount').textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
  const applied = jobs.filter(j => j.status === 'Applied').length;
  const saved = jobs.filter(j => j.status === 'Saved').length;
  document.getElementById('appliedCount').textContent = `${applied} applied \u00B7 ${saved} saved`;

  const filtered = srcFilter === 'all' ? jobs : jobs.filter(j => j.source === srcFilter);
  const sorted = [...filtered].sort(SORT_FNS[sortBy] || (() => 0));

  if (!jobs.length) { list.innerHTML = '<div class="empty"><h2>No jobs saved yet</h2><p>Visit a job listing on LinkedIn or Indeed<br>and click "Save Job" to start tracking.</p></div>'; return; }
  if (!sorted.length) { list.innerHTML = '<div class="empty"><h2>No matching jobs</h2><p>Try changing the source filter.</p></div>'; return; }

  const nl = '<span class="detail-value not-listed">Not listed</span>';
  const field = (label, val, cls) => `<div class="detail-field"><span class="detail-label">${label}</span>${val ? `<span class="detail-value${cls ? ' ' + cls : ''}">${val}</span>` : nl}</div>`;

  list.innerHTML = sorted.map(job => {
    const id = esc(job.id), url = esc(job.url), title = esc(job.title) || 'Untitled';
    const company = esc(job.company) || 'Unknown', loc = esc(job.location) || 'N/A';
    const ht = esc(job.hiringTeam), htUrl = esc(job.hiringTeamUrl);
    const htHtml = ht ? (htUrl ? `<a href="${htUrl}" target="_blank">${ht}</a>` : ht) : '';
    const icon = job.source === 'LinkedIn' ? LINKEDIN_ICON : job.source === 'Indeed' ? INDEED_ICON : '';
    const benefitsHtml = job.benefits ? `<details class="benefits-dropdown"><summary>Benefits</summary><ul class="benefits-list">${job.benefits.split(', ').map(b => `<li>${esc(b)}</li>`).join('')}</ul></details>` : '';

    return `<div class="job-card" data-id="${id}">
      <div class="job-compact">
        ${icon ? `<div class="source-icon">${icon}</div>` : ''}
        <div class="job-compact-content">
          <div class="job-compact-top"><span class="job-compact-title"><a href="${url}" target="_blank">${title}</a></span></div>
          <div class="job-compact-sub">${company}<span class="dot">\u00B7</span>${loc}</div>
        </div>
        <div class="chevron">\u25BE</div>
      </div>
      <div class="job-details"><div class="job-details-inner">
        <div class="detail-fields">
          ${field('Salary', esc(job.salary), 'salary')}
          ${field('Applicants', esc(job.applicants))}
          ${field('Experience Level', esc(job.seniority))}
          ${field('Education', esc(job.education))}
          ${field('Work Type', esc(job.workType))}
          ${field('Applied', timeSince(job.date) || 'Today')}
          ${field('Hiring Contact', htHtml)}
          ${field('Date Saved', `<span style="color:#a8a29e">${esc(job.date)}</span>`)}
        </div>
        ${benefitsHtml}
        <div class="detail-actions">
          <div class="detail-actions-left"><label>Status</label>
            <select class="status-select" data-id="${id}">${STATUS_OPTIONS.map(s => `<option${job.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          </div>
          <button class="delete-btn" data-id="${id}">Remove</button>
        </div>
      </div></div>
    </div>`;
  }).join('');

  // Expand/collapse
  list.querySelectorAll('.job-compact').forEach(c => c.addEventListener('click', e => {
    if (!e.target.closest('a')) c.closest('.job-card').classList.toggle('expanded');
  }));

  // Status change
  list.querySelectorAll('.status-select').forEach(sel => sel.addEventListener('change', async e => {
    e.stopPropagation();
    const all = await loadJobs();
    const job = all.find(j => j.id === e.target.dataset.id);
    if (job) { job.status = e.target.value; await saveJobs(all); }
    document.getElementById('appliedCount').textContent = `${all.filter(j => j.status === 'Applied').length} applied \u00B7 ${all.filter(j => j.status === 'Saved').length} saved`;
  }));

  // Delete
  list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async e => {
    e.stopPropagation();
    const all = await loadJobs();
    const remaining = all.filter(j => j.id !== e.target.dataset.id);
    await saveJobs(remaining);
    renderJobs(remaining);
  }));
}

function jobsToCsv(jobs) {
  const H = ['Title','Company','Location','Salary','Applicants','Education','Seniority','Benefits','Hiring Team','Hiring Team URL','Work Type','Source','Date Saved','Time Since Applied','Status','URL'];
  const rows = jobs.map(j => [j.title, j.company, j.location, j.salary, j.applicants, j.education, j.seniority, j.benefits, j.hiringTeam, j.hiringTeamUrl, j.workType, j.source, j.date, timeSince(j.date), j.status, j.url].map(v => `"${(v || '').replace(/"/g, '""')}"`));
  return [H.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function downloadCsv(jobs) {
  const blob = new Blob([jobsToCsv(jobs)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `job-applications-${new Date().toISOString().split('T')[0]}.csv` }).click();
  URL.revokeObjectURL(url);
}

// Event listeners
document.getElementById('sortSelect').addEventListener('change', () => loadJobs().then(renderJobs));
document.getElementById('sourceFilter').addEventListener('change', () => loadJobs().then(renderJobs));

document.getElementById('exportCsv').addEventListener('click', async () => {
  const jobs = await loadJobs();
  if (jobs.length) downloadCsv(jobs);
});

document.getElementById('exportSheets').addEventListener('click', async () => {
  const jobs = await loadJobs();
  if (!jobs.length) return;
  downloadCsv(jobs);
  chrome.tabs.create({ url: 'https://docs.google.com/spreadsheets/u/0/?tgif=c#import' });
});

document.getElementById('clearAll').addEventListener('click', async () => {
  const jobs = await loadJobs();
  if (jobs.length && confirm(`Permanently delete all ${jobs.length} saved job${jobs.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
    await saveJobs([]);
    renderJobs([]);
  }
});

document.getElementById('openSidebar').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
  } catch {
    alert('Sidebar is only available on LinkedIn and Indeed job pages.');
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  window.close();
});

loadJobs().then(renderJobs);
