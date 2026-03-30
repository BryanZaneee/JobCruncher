const STATUS_OPTIONS = ['Applied', 'Contacted', 'No Response', 'Interviewed', 'Offer', 'Rejected'];

const LINKEDIN_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#0A66C2"/><path d="M7.5 10.5v6M7.5 7.5v.01M10.5 16.5v-3.75c0-1.5 1.5-1.5 1.5-1.5s1.5 0 1.5 1.5v3.75M10.5 10.5v6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const INDEED_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#003A9B"/><path d="M13.5 5c-1.1 0-2 .7-2 1.5S12.4 8 13.5 8s2-.7 2-1.5S14.6 5 13.5 5zm-1.5 5v8h3v-8h-3z" fill="#fff"/></svg>';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function timeSinceApplied(dateStr) {
  if (!dateStr) return '';
  const applied = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = now - applied;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (days < 30) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function parseSalaryNumber(salaryStr) {
  if (!salaryStr) return 0;
  const match = salaryStr.match(/\$?([\d,]+)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/,/g, ''), 10) || 0;
}

function sortJobs(jobs, sortBy) {
  const sorted = [...jobs];
  switch (sortBy) {
    case 'newest':
      sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      break;
    case 'oldest':
      sorted.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      break;
    case 'salary-desc':
      sorted.sort((a, b) => parseSalaryNumber(b.salary) - parseSalaryNumber(a.salary));
      break;
    case 'salary-asc':
      sorted.sort((a, b) => parseSalaryNumber(a.salary) - parseSalaryNumber(b.salary));
      break;
    case 'alpha-az':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'alpha-za':
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    case 'company-az':
      sorted.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
      break;
    case 'company-za':
      sorted.sort((a, b) => (b.company || '').localeCompare(a.company || ''));
      break;
  }
  return sorted;
}

async function loadJobs() {
  try {
    const { jobs = [] } = await chrome.storage.local.get('jobs');
    return jobs;
  } catch {
    return [];
  }
}

async function saveJobs(jobs) {
  await chrome.storage.local.set({ jobs });
}

function renderJobs(jobs) {
  const list = document.getElementById('jobList');
  const countEl = document.getElementById('jobCount');
  const appliedEl = document.getElementById('appliedCount');
  const sortBy = document.getElementById('sortSelect').value;
  const sourceFilter = document.getElementById('sourceFilter').value;

  countEl.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
  const appliedTotal = jobs.filter(j => j.status === 'Applied').length;
  appliedEl.textContent = `${appliedTotal} applied`;

  const filtered = sourceFilter === 'all' ? jobs : jobs.filter(j => j.source === sourceFilter);
  const sorted = sortJobs(filtered, sortBy);

  if (jobs.length === 0) {
    list.innerHTML = '<div class="empty"><h2>No jobs saved yet</h2><p>Visit a job listing on LinkedIn or Indeed<br>and click "Save Job" to start tracking.</p></div>';
    return;
  }
  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty"><h2>No matching jobs</h2><p>Try changing the source filter.</p></div>';
    return;
  }

  list.innerHTML = sorted.map(job => {
    const id = escapeHtml(job.id);
    const title = escapeHtml(job.title) || 'Untitled';
    const url = escapeHtml(job.url);
    const company = escapeHtml(job.company) || 'Unknown';
    const location = escapeHtml(job.location) || 'N/A';
    const salary = escapeHtml(job.salary);
    const hiringTeam = escapeHtml(job.hiringTeam);
    const hiringTeamUrl = escapeHtml(job.hiringTeamUrl);
    const source = escapeHtml(job.source) || 'Manual';
    const workType = escapeHtml(job.workType);
    const date = escapeHtml(job.date);
    const applicants = escapeHtml((job.applicants || '').replace(/Promoted.*$/i, '').trim());
    const education = escapeHtml(job.education);
    const seniority = escapeHtml(job.seniority);
    const benefits = escapeHtml(job.benefits);
    const elapsed = escapeHtml(timeSinceApplied(job.date));
    const salaryDisplay = salary || 'No salary listed';

    // Build labeled detail fields
    let detailRows = '';

    const notListed = '<span class="detail-value not-listed">Not listed</span>';

    // Salary
    detailRows += `<div class="detail-field">
      <span class="detail-label">Salary</span>
      ${salary ? `<span class="detail-value salary">${salary}</span>` : notListed}
    </div>`;

    // Applicants
    detailRows += `<div class="detail-field">
      <span class="detail-label">Applicants</span>
      ${applicants ? `<span class="detail-value">${applicants}</span>` : notListed}
    </div>`;

    // Experience level
    detailRows += `<div class="detail-field">
      <span class="detail-label">Experience Level</span>
      ${seniority ? `<span class="detail-value">${seniority}</span>` : notListed}
    </div>`;

    // Education
    detailRows += `<div class="detail-field">
      <span class="detail-label">Education</span>
      ${education ? `<span class="detail-value">${education}</span>` : notListed}
    </div>`;

    // Work type
    detailRows += `<div class="detail-field">
      <span class="detail-label">Work Type</span>
      ${workType ? `<span class="detail-value">${workType}</span>` : notListed}
    </div>`;

    // Days since applied
    detailRows += `<div class="detail-field">
      <span class="detail-label">Applied</span>
      <span class="detail-value">${elapsed || 'Today'}</span>
    </div>`;

    // Hiring team
    const hiringDisplay = hiringTeam
      ? (hiringTeamUrl ? `<span class="detail-value"><a href="${hiringTeamUrl}" target="_blank">${hiringTeam}</a></span>` : `<span class="detail-value">${hiringTeam}</span>`)
      : notListed;
    detailRows += `<div class="detail-field">
      <span class="detail-label">Hiring Contact</span>
      ${hiringDisplay}
    </div>`;

    // Date saved
    detailRows += `<div class="detail-field">
      <span class="detail-label">Date Saved</span>
      <span class="detail-value" style="color:#a8a29e">${date}</span>
    </div>`;

    // Benefits dropdown
    const benefitsHtml = benefits ? `
      <details class="benefits-dropdown">
        <summary>Benefits</summary>
        <ul class="benefits-list">
          ${benefits.split(', ').map(b => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </details>` : '';

    const sourceIcon = source === 'LinkedIn' ? LINKEDIN_ICON : source === 'Indeed' ? INDEED_ICON : '';

    return `
      <div class="job-card" data-id="${id}">
        <div class="job-compact">
          ${sourceIcon ? `<div class="source-icon">${sourceIcon}</div>` : ''}
          <div class="job-compact-content">
            <div class="job-compact-top">
              <span class="job-compact-title"><a href="${url}" target="_blank">${title}</a></span>
            </div>
            <div class="job-compact-sub">${company}<span class="dot">·</span>${location}</div>
          </div>
          <div class="chevron">▾</div>
        </div>
        <div class="job-details">
          <div class="job-details-inner">
            <div class="detail-fields">${detailRows}</div>
            ${benefitsHtml}
            <div class="detail-actions">
              <div class="detail-actions-left">
                <label>Status</label>
                <select class="status-select" data-id="${id}">
                  ${STATUS_OPTIONS.map(s => `<option value="${s}" ${job.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </div>
              <button class="delete-btn" data-id="${id}">Remove</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Expand / collapse
  list.querySelectorAll('.job-compact').forEach(compact => {
    compact.addEventListener('click', (e) => {
      // Don't toggle when clicking the title link
      if (e.target.closest('a')) return;
      const card = compact.closest('.job-card');
      card.classList.toggle('expanded');
    });
  });

  // Status change
  list.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      e.stopPropagation();
      const jobId = e.target.dataset.id;
      const jobs = await loadJobs();
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        job.status = e.target.value;
        await saveJobs(jobs);
        // Update applied count
        const appliedTotal = jobs.filter(j => j.status === 'Applied').length;
        document.getElementById('appliedCount').textContent = `${appliedTotal} applied`;
      }
    });
  });

  // Delete
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobId = e.target.dataset.id;
      const jobs = await loadJobs();
      const filtered = jobs.filter(j => j.id !== jobId);
      await saveJobs(filtered);
      renderJobs(filtered);
    });
  });
}

function jobsToCsv(jobs) {
  const headers = ['Title', 'Company', 'Location', 'Salary', 'Applicants', 'Education', 'Seniority', 'Benefits', 'Hiring Team', 'Hiring Team URL', 'Work Type', 'Source', 'Date Saved', 'Time Since Applied', 'Status', 'URL'];
  const rows = jobs.map(j => [
    j.title, j.company, j.location, j.salary, j.applicants, j.education, j.seniority, j.benefits, j.hiringTeam, j.hiringTeamUrl, j.workType, j.source, j.date, timeSinceApplied(j.date), j.status, j.url
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`));
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

document.getElementById('sortSelect').addEventListener('change', async () => {
  const jobs = await loadJobs();
  renderJobs(jobs);
});

document.getElementById('sourceFilter').addEventListener('change', async () => {
  const jobs = await loadJobs();
  renderJobs(jobs);
});

document.getElementById('exportCsv').addEventListener('click', async () => {
  const jobs = await loadJobs();
  if (jobs.length === 0) return;
  const csv = jobsToCsv(jobs);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('exportSheets').addEventListener('click', async () => {
  const jobs = await loadJobs();
  if (jobs.length === 0) return;
  const btn = document.getElementById('exportSheets');

  // Download CSV file first
  const csv = jobsToCsv(jobs);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  // Then open Google Sheets import page
  chrome.tabs.create({ url: 'https://docs.google.com/spreadsheets/u/0/?tgif=c#import' });
  btn.textContent = 'Downloaded!';
  setTimeout(() => { btn.textContent = 'Sheets'; }, 3000);
});

document.getElementById('clearAll').addEventListener('click', async () => {
  const jobs = await loadJobs();
  if (jobs.length === 0) return;
  if (confirm(`This will permanently delete all ${jobs.length} saved job${jobs.length !== 1 ? 's' : ''}. This cannot be undone.\n\nAre you sure?`)) {
    await saveJobs([]);
    renderJobs([]);
  }
});

document.getElementById('openSidebar').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  window.close();
});

loadJobs().then(renderJobs);
