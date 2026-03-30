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
    const elapsed = escapeHtml(timeSinceApplied(job.date));

    // Build detail rows — only include rows that have data
    let detailRows = '';

    // Compensation row
    if (salary || applicants) {
      detailRows += `<div class="detail-row">
        ${salary ? `<span class="detail-value salary">${salary}</span>` : ''}
        ${applicants ? `<span class="detail-value">${applicants}</span>` : ''}
      </div>`;
    }

    // Qualifications row
    if (seniority || education) {
      detailRows += `<div class="detail-row">
        ${seniority ? `<span class="detail-value">${seniority}</span>` : ''}
        ${seniority && education ? `<span class="detail-value" style="color:#d6d3d1">·</span>` : ''}
        ${education ? `<span class="detail-value">${education}</span>` : ''}
      </div>`;
    }

    // Hiring team row
    if (hiringTeam) {
      const hiringHtml = hiringTeamUrl
        ? `<a href="${hiringTeamUrl}" target="_blank">${hiringTeam}</a>`
        : hiringTeam;
      detailRows += `<div class="detail-row">
        <span class="detail-label">Hiring contact</span>
        <span class="detail-value">${hiringHtml}</span>
      </div>`;
    }

    // Metadata row
    detailRows += `<div class="detail-row">
      ${workType ? `<span class="detail-tag">${workType}</span>` : ''}
      <span class="detail-value" style="font-size:11px;color:#a8a29e">${date}</span>
    </div>`;

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
            ${detailRows}
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
  const headers = ['Title', 'Company', 'Location', 'Salary', 'Applicants', 'Education', 'Seniority', 'Hiring Team', 'Hiring Team URL', 'Work Type', 'Source', 'Date Saved', 'Time Since Applied', 'Status', 'URL'];
  const rows = jobs.map(j => [
    j.title, j.company, j.location, j.salary, j.applicants, j.education, j.seniority, j.hiringTeam, j.hiringTeamUrl, j.workType, j.source, j.date, timeSinceApplied(j.date), j.status, j.url
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

  // Build CSV content for Google Sheets import
  const csv = jobsToCsv(jobs);

  // Copy to clipboard first (before opening tab steals focus)
  try {
    await navigator.clipboard.writeText(csv);
    btn.textContent = 'Copied!';
  } catch {
    // Fallback: use textarea-based copy
    const textarea = document.createElement('textarea');
    textarea.value = csv;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.textContent = 'Copied!';
  }

  // Open new Google Sheet
  chrome.tabs.create({ url: 'https://sheets.new' });
  setTimeout(() => { btn.textContent = 'Sheets'; }, 3000);
});

document.getElementById('clearAll').addEventListener('click', async () => {
  if (confirm('Clear all saved jobs?')) {
    await saveJobs([]);
    renderJobs([]);
  }
});

loadJobs().then(renderJobs);
