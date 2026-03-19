// js/admin.js
// ================================================
// ADMIN PANEL — Node.js API powered
// ================================================

const API_URL = '';

let currentMessageId = null;
let editingProjectId = null;

// ── AUTH ──────────────────────────────────────────────
async function login() {
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  err.style.display = 'none';

  try {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      err.textContent = 'Invalid credentials'; err.style.display = 'block'; return;
    }

    sessionStorage.setItem('admin_auth', 'true');
    showApp();
  } catch (e) {
    err.textContent = 'Login failed'; err.style.display = 'block';
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('loginScreen').style.display = 'flex';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  loadDashboard(); loadProjects(); loadMessages(); loadProfile();
}

if (sessionStorage.getItem('admin_auth')) showApp();

// ── DASHBOARD ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const [analytics, messages, projects] = await Promise.all([
      fetch(`${API_URL}/api/admin/analytics`).then(r => r.json()),
      fetch(`${API_URL}/api/admin/messages`).then(r => r.json()),
      fetch(`${API_URL}/api/admin/projects`).then(r => r.json())
    ]);

    const pageViews = analytics.filter(a => a.type === 'page_view').length;
    const projectViews = analytics.filter(a => a.type === 'project_view').length;
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(m => !m.read).length;

    document.getElementById('statPageViews').textContent = pageViews.toLocaleString();
    document.getElementById('statProjectViews').textContent = projectViews.toLocaleString();
    document.getElementById('statMessages').textContent = totalMessages;
    document.getElementById('statUnread').textContent = unreadMessages;

    if (unreadMessages > 0) {
      const b = document.getElementById('unreadBadge');
      b.textContent = unreadMessages; b.style.display = 'inline-block';
    }

    const topProjects = [...projects].sort((a, b) => b.views - a.views).slice(0, 6);
    document.getElementById('topProjectsTable').innerHTML = topProjects.map(p => `
      <tr><td>${p.emoji} ${p.title}</td><td><span class="badge badge-blue">${p.views}</span></td></tr>
    `).join('') || '<tr><td colspan="2" class="empty-state">No data yet</td></tr>';

    const recentMessages = [...messages].slice(0, 5);
    document.getElementById('recentMessagesTable').innerHTML = recentMessages.map(m => `
      <tr>
        <td>${m.read ? '' : '<span class="unread-dot"></span>'}${m.name}</td>
        <td>${m.subject}</td>
        <td style="color:var(--muted)">${new Date(m.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="3" class="empty-state">No messages yet</td></tr>';

  } catch (e) { console.error('Dashboard error:', e); }
}

// ── PROJECTS ──────────────────────────────────────────
async function loadProjects() {
  const res = await fetch(`${API_URL}/api/admin/projects`);
  const projects = await res.json();

  document.getElementById('projectsTable').innerHTML = (projects || []).map(p => `
    <tr>
      <td>${p.emoji} <strong>${p.title}</strong></td>
      <td>${(p.tags || []).map(t => `<span class="badge badge-blue" style="margin-right:3px">${t}</span>`).join('')}</td>
      <td>${p.views}</td>
      <td><span class="badge ${p.featured ? 'badge-green' : 'badge-yellow'}">${p.featured ? 'Visible' : 'Hidden'}</span></td>
      <td style="display:flex;gap:0.5rem;">
        <button class="btn btn-ghost" style="padding:0.4rem 0.75rem;" onclick="editProject('${p.id}')">Edit</button>
        <button class="btn btn-danger" style="padding:0.4rem 0.75rem;" onclick="deleteProject('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">No projects yet. Add one!</td></tr>';
}

function openProjectModal(project = null) {
  editingProjectId = project?.id || null;
  document.getElementById('projectModalTitle').textContent = project ? 'Edit Project' : 'Add Project';
  document.getElementById('pTitle').value = project?.title || '';
  document.getElementById('pDesc').value = project?.description || '';
  document.getElementById('pEmoji').value = project?.emoji || '🚀';
  document.getElementById('pOrder').value = project?.display_order || 0;
  document.getElementById('pTags').value = (project?.tags || []).join(', ');
  document.getElementById('pGithub').value = project?.github_url || '';
  document.getElementById('pLive').value = project?.live_url || '';
  document.getElementById('pFeatured').checked = project?.featured !== false;
  document.getElementById('pSubtitle').value = project?.case_study?.subtitle || '';
  document.getElementById('pOverview').value = project?.case_study?.overview || '';
  document.getElementById('pBuilt').value = (project?.case_study?.whatIBuilt || []).join('\n');
  document.getElementById('pOutcome').value = project?.case_study?.outcome || '';
  document.getElementById('projectModal').classList.add('active');
}

function closeProjectModal() {
  document.getElementById('projectModal').classList.remove('active');
  editingProjectId = null;
}

async function editProject(id) {
  const res = await fetch(`${API_URL}/api/admin/projects`);
  const projects = await res.json();
  const project = projects.find(p => p.id === id);
  if (project) openProjectModal(project);
}

async function saveProject() {
  const body = {
    title: document.getElementById('pTitle').value,
    description: document.getElementById('pDesc').value,
    emoji: document.getElementById('pEmoji').value,
    display_order: parseInt(document.getElementById('pOrder').value) || 0,
    tags: document.getElementById('pTags').value.split(',').map(t => t.trim()).filter(Boolean),
    github_url: document.getElementById('pGithub').value,
    live_url: document.getElementById('pLive').value,
    featured: document.getElementById('pFeatured').checked,
    case_study: {
      subtitle: document.getElementById('pSubtitle').value,
      overview: document.getElementById('pOverview').value,
      whatIBuilt: document.getElementById('pBuilt').value.split('\n').filter(Boolean),
      outcome: document.getElementById('pOutcome').value
    }
  };

  const url = editingProjectId
    ? `${API_URL}/api/admin/projects/${editingProjectId}`
    : `${API_URL}/api/admin/projects`;
  const method = editingProjectId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) { showToast('Failed to save', 'error'); return; }
  closeProjectModal(); loadProjects(); loadDashboard();
  showToast(editingProjectId ? 'Project updated!' : 'Project created!');
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  const res = await fetch(`${API_URL}/api/admin/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) { showToast('Failed to delete', 'error'); return; }
  loadProjects(); loadDashboard(); showToast('Project deleted');
}

// ── MESSAGES ──────────────────────────────────────────
async function loadMessages() {
  const res = await fetch(`${API_URL}/api/admin/messages`);
  const messages = await res.json();

  document.getElementById('messagesTable').innerHTML = (messages || []).map(m => `
    <tr>
      <td>${m.read ? '' : '<span class="unread-dot"></span>'}<strong>${m.name}</strong><br>
        <span style="color:var(--muted);font-size:0.8rem">${m.email}</span></td>
      <td>${m.subject}</td>
      <td style="color:var(--muted)">${new Date(m.created_at).toLocaleDateString()}</td>
      <td><span class="badge ${m.read ? 'badge-green' : 'badge-yellow'}">${m.read ? 'Read' : 'Unread'}</span></td>
      <td><button class="btn btn-ghost" style="padding:0.4rem 0.75rem;"
        onclick="viewMessage('${m.id}','${m.name}','${m.email}','${m.subject}',\`${m.message.replace(/`/g,'\\`')}\`,${m.read})">View</button></td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">No messages yet</td></tr>';
}

async function viewMessage(id, name, email, subject, message, read) {
  currentMessageId = id;
  document.getElementById('messageModalBody').innerHTML = `
    <div style="display:grid;gap:0.75rem;">
      <div style="display:grid;grid-template-columns:80px 1fr;gap:0.5rem;font-size:0.9rem;">
        <span style="color:var(--muted)">From</span><strong>${name}</strong>
        <span style="color:var(--muted)">Email</span><a href="mailto:${email}" style="color:var(--blue-light)">${email}</a>
        <span style="color:var(--muted)">Subject</span><span>${subject}</span>
      </div>
      <div style="background:var(--navy-light);padding:1.25rem;border-radius:8px;color:var(--muted);font-size:0.9rem;line-height:1.8;margin-top:0.5rem;">
        ${message.replace(/\n/g,'<br>')}
      </div>
    </div>`;
  document.getElementById('msgDeleteBtn').onclick = () => deleteMessage(id);
  document.getElementById('messageModal').classList.add('active');

  if (!read) {
    await fetch(`${API_URL}/api/admin/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true })
    });
    loadMessages(); loadDashboard();
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  await fetch(`${API_URL}/api/admin/messages/${id}`, { method: 'DELETE' });
  closeMessageModal(); loadMessages(); loadDashboard();
  showToast('Message deleted');
}

function closeMessageModal() { document.getElementById('messageModal').classList.remove('active'); }

// ── PROFILE ───────────────────────────────────────────
async function loadProfile() {
  const res = await fetch(`${API_URL}/api/admin/profile`);
  const p = await res.json();
  if (!p) return;

  document.getElementById('profileName').value = p.name || '';
  document.getElementById('profileTagline').value = p.tagline || '';
  document.getElementById('profileBio').value = (p.bio || []).join('\n');
  document.getElementById('profileSkills').value = (p.skills || []).join(', ');
  document.getElementById('statYears').value = p.years_experience || '';
  document.getElementById('statProjects').value = p.projects_shipped || '';
  document.getElementById('statClients').value = p.happy_clients || '';
  document.getElementById('profileAvailability').value = p.availability || '';
  document.getElementById('socialGithub').value = p.github_url || '';
  document.getElementById('socialLinkedin').value = p.linkedin_url || '';
  document.getElementById('socialInstagram').value = p.instagram_url || '';
  document.getElementById('socialWhatsapp').value = p.whatsapp_url || '';
  document.getElementById('socialEmail').value = p.email || '';
}

async function saveProfile() {
  const body = {
    name: document.getElementById('profileName').value,
    tagline: document.getElementById('profileTagline').value,
    bio: document.getElementById('profileBio').value.split('\n').filter(Boolean),
    skills: document.getElementById('profileSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    years_experience: document.getElementById('statYears').value,
    projects_shipped: document.getElementById('statProjects').value,
    happy_clients: document.getElementById('statClients').value,
    availability: document.getElementById('profileAvailability').value,
    github_url: document.getElementById('socialGithub').value,
    linkedin_url: document.getElementById('socialLinkedin').value,
    instagram_url: document.getElementById('socialInstagram').value,
    whatsapp_url: document.getElementById('socialWhatsapp').value,
    email: document.getElementById('socialEmail').value,
    updated_at: new Date().toISOString()
  };

  const res = await fetch(`${API_URL}/api/admin/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) { showToast('Failed to save', 'error'); return; }
  showToast('Profile saved! ✓');
}

// ── UTILS ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}  currentMessageId = id;
  document.getElementById('messageModalBody').innerHTML = `
    <div style="display:grid;gap:0.75rem;">
      <div style="display:grid;grid-template-columns:80px 1fr;gap:0.5rem;font-size:0.9rem;">
        <span style="color:var(--muted)">From</span><strong>${name}</strong>
        <span style="color:var(--muted)">Email</span><a href="mailto:${email}" style="color:var(--blue-light)">${email}</a>
        <span style="color:var(--muted)">Subject</span><span>${subject}</span>
      </div>
      <div style="background:var(--navy-light);padding:1.25rem;border-radius:8px;color:var(--muted);font-size:0.9rem;line-height:1.8;margin-top:0.5rem;">
        ${message.replace(/\n/g,'<br>')}
      </div>
    </div>`;
  document.getElementById('msgDeleteBtn').onclick = () => deleteMessage(id);
  document.getElementById('messageModal').classList.add('active');

  if (!read) {
    await adminSupabase.from('messages').update({ read: true }).eq('id', id);
    loadMessages(); loadDashboard();
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  await adminSupabase.from('messages').delete().eq('id', id);
  closeMessageModal(); loadMessages(); loadDashboard();
  showToast('Message deleted');
}

function closeMessageModal() { document.getElementById('messageModal').classList.remove('active'); }

// ── PROFILE ───────────────────────────────────────────
async function loadProfile() {
  const { data: p } = await adminSupabase.from('profile').select('*').single();
  if (!p) return;

  document.getElementById('profileName').value = p.name || '';
  document.getElementById('profileTagline').value = p.tagline || '';
  document.getElementById('profileBio').value = (p.bio || []).join('\n');
  document.getElementById('profileSkills').value = (p.skills || []).join(', ');
  document.getElementById('statYears').value = p.years_experience || '';
  document.getElementById('statProjects').value = p.projects_shipped || '';
  document.getElementById('statClients').value = p.happy_clients || '';
  document.getElementById('profileAvailability').value = p.availability || '';
  document.getElementById('socialGithub').value = p.github_url || '';
  document.getElementById('socialLinkedin').value = p.linkedin_url || '';
  document.getElementById('socialInstagram').value = p.instagram_url || '';
  document.getElementById('socialWhatsapp').value = p.whatsapp_url || '';
  document.getElementById('socialEmail').value = p.email || '';
}

async function saveProfile() {
  const body = {
    name: document.getElementById('profileName').value,
    tagline: document.getElementById('profileTagline').value,
    bio: document.getElementById('profileBio').value.split('\n').filter(Boolean),
    skills: document.getElementById('profileSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    years_experience: document.getElementById('statYears').value,
    projects_shipped: document.getElementById('statProjects').value,
    happy_clients: document.getElementById('statClients').value,
    availability: document.getElementById('profileAvailability').value,
    github_url: document.getElementById('socialGithub').value,
    linkedin_url: document.getElementById('socialLinkedin').value,
    instagram_url: document.getElementById('socialInstagram').value,
    whatsapp_url: document.getElementById('socialWhatsapp').value,
    email: document.getElementById('socialEmail').value,
    updated_at: new Date().toISOString()
  };

  const { data } = await adminSupabase.from('profile').select('id').single();
  const { error } = data
    ? await adminSupabase.from('profile').update(body).eq('id', data.id)
    : await adminSupabase.from('profile').insert(body);

  if (error) { showToast('Failed to save: ' + error.message, 'error'); return; }
  showToast('Profile saved! ✓');
}

// ── UTILS ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}
