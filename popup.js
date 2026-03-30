const STATUS_OPTIONS = ['Applied', 'Contacted', 'No Response', 'Interviewed', 'Offer', 'Rejected'];

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
  const count = document.getElementById('jobCount');
  const sortBy = document.getElementById('sortSelect').value;
  const sorted = sortJobs(jobs, sortBy);

  count.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;

  if (jobs.length === 0) {
    list.innerHTML = '<div class="empty"><h2>No jobs saved yet</h2><p>Visit a job listing on LinkedIn or Indeed and click the "Save Job" button to start tracking.</p></div>';
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

    const applicants = escapeHtml(job.applicants);
    const education = escapeHtml(job.education);
    const seniority = escapeHtml(job.seniority);
    const elapsed = escapeHtml(timeSinceApplied(job.date));

    const hiringHtml = hiringTeam
      ? hiringTeamUrl
        ? `<span class="hiring"><a href="${hiringTeamUrl}" target="_blank">${hiringTeam}</a></span>`
        : `<span class="hiring">${hiringTeam}</span>`
      : '';

    return `
      <div class="job-card" data-id="${id}">
        <div class="job-title">
          <a href="${url}" target="_blank">${title}</a>
          <button class="delete-btn" data-id="${id}" title="Remove">&times;</button>
        </div>
        <div class="job-meta">
          <span>${company}</span>
          <span>${location}</span>
          ${salary ? `<span class="salary">${salary}</span>` : ''}
          ${applicants ? `<span class="applicants">${applicants}</span>` : ''}
          ${hiringHtml}
          <br>
          <span class="source-badge ${source === 'Indeed' ? 'indeed' : ''}">${source}</span>
          ${workType ? `<span>${workType}</span>` : ''}
          ${seniority ? `<span class="seniority">${seniority}</span>` : ''}
          ${education ? `<span class="education">${education}</span>` : ''}
          <span class="date-badge">${date}</span>
          ${elapsed ? `<span class="elapsed">${elapsed}</span>` : ''}
        </div>
        <div class="status-row">
          <label>Status:</label>
          <select class="status-select" data-id="${id}">
            ${STATUS_OPTIONS.map(s => `<option value="${s}" ${job.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const jobId = e.target.dataset.id;
      const jobs = await loadJobs();
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        job.status = e.target.value;
        await saveJobs(jobs);
      }
    });
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
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
  const headers = ['Title', 'Company', 'Location', 'Salary', 'Applicants', 'Education', 'Seniority', 'Hiring Team', 'Hiring Team URL', 'Work Type', 'Source', 'Date Saved', 'Time Since Applied', 'Status', 'URL'];
  const data = [headers, ...jobs.map(j => [
    j.title, j.company, j.location, j.salary, j.applicants, j.education, j.seniority, j.hiringTeam, j.hiringTeamUrl, j.workType, j.source, j.date, timeSinceApplied(j.date), j.status, j.url
  ])];
  const tsvContent = data.map(row => row.map(cell => (cell || '').replace(/\t/g, ' ')).join('\t')).join('\n');

  const btn = document.getElementById('exportSheets');
  try {
    await navigator.clipboard.writeText(tsvContent);
    chrome.tabs.create({ url: 'https://sheets.new' });
    btn.textContent = 'Copied! Paste in sheet';
    setTimeout(() => { btn.textContent = 'Google Sheets'; }, 3000);
  } catch {
    btn.textContent = 'Copy failed';
    setTimeout(() => { btn.textContent = 'Google Sheets'; }, 2000);
  }
});

document.getElementById('clearAll').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all saved jobs?')) {
    await saveJobs([]);
    renderJobs([]);
  }
});

loadJobs().then(renderJobs);
