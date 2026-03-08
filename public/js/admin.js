// js/admin.js
// ================================================
// ADMIN PANEL — Supabase powered
// ================================================

const SUPABASE_URL = 'https://kjvhnjycerrcesulttou.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqdmhuanljZXJyY2VzdWx0dG91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NjkzNiwiZXhwIjoyMDg3NzQyOTM2fQ.vKSLLlbYVP8ErMXS0RzuoWt0tot6WYBe-nzad1cGZEk'; // Keep this secret! Never expose in frontend

// For admin panel, use service role key for full DB access
const adminSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let currentMessageId = null;
let editingProjectId = null;

// ── AUTH ──────────────────────────────────────────────
async function login() {
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  err.style.display = 'none';

  try {
    // Check admin_users table
    const { data, error } = await adminSupabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      err.textContent = 'Invalid credentials'; err.style.display = 'block'; return;
    }

    // Simple password check (in production use bcrypt via Edge Function)
    if (data.password_hash !== btoa(password)) {
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

// Check if already logged in
if (sessionStorage.getItem('admin_auth')) showApp();

// ── DASHBOARD ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const [
      { count: pageViews },
      { count: projectViews },
      { count: totalMessages },
      { count: unreadMessages },
      { data: topProjects },
      { data: recentMessages }
    ] = await Promise.all([
      adminSupabase.from('analytics').select('*', { count: 'exact', head: true }).eq('type', 'page_view'),
      adminSupabase.from('analytics').select('*', { count: 'exact', head: true }).eq('type', 'project_view'),
      adminSupabase.from('messages').select('*', { count: 'exact', head: true }),
      adminSupabase.from('messages').select('*', { count: 'exact', head: true }).eq('read', false),
      adminSupabase.from('projects').select('id, title, emoji, views').order('views', { ascending: false }).limit(6),
      adminSupabase.from('messages').select('id, name, email, subject, read, created_at').order('created_at', { ascending: false }).limit(5)
    ]);

    document.getElementById('statPageViews').textContent = (pageViews || 0).toLocaleString();
    document.getElementById('statProjectViews').textContent = (projectViews || 0).toLocaleString();
    document.getElementById('statMessages').textContent = totalMessages || 0;
    document.getElementById('statUnread').textContent = unreadMessages || 0;

    if (unreadMessages > 0) {
      const b = document.getElementById('unreadBadge');
      b.textContent = unreadMessages; b.style.display = 'inline-block';
    }

    document.getElementById('topProjectsTable').innerHTML = (topProjects || []).map(p => `
      <tr><td>${p.emoji} ${p.title}</td><td><span class="badge badge-blue">${p.views}</span></td></tr>
    `).join('') || '<tr><td colspan="2" class="empty-state">No data yet</td></tr>';

    document.getElementById('recentMessagesTable').innerHTML = (recentMessages || []).map(m => `
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
  const { data: projects, error } = await adminSupabase
    .from('projects').select('*').order('display_order', { ascending: true });

  if (error) { console.error(error); return; }

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
  const { data } = await adminSupabase.from('projects').select('*').eq('id', id).single();
  if (data) openProjectModal(data);
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

  let error;
  if (editingProjectId) {
    ({ error } = await adminSupabase.from('projects').update(body).eq('id', editingProjectId));
  } else {
    ({ error } = await adminSupabase.from('projects').insert(body));
  }

  if (error) { showToast('Failed to save: ' + error.message, 'error'); return; }
  closeProjectModal(); loadProjects(); loadDashboard();
  showToast(editingProjectId ? 'Project updated!' : 'Project created!');
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  const { error } = await adminSupabase.from('projects').delete().eq('id', id);
  if (error) { showToast('Failed to delete', 'error'); return; }
  loadProjects(); loadDashboard(); showToast('Project deleted');
}

// ── MESSAGES ──────────────────────────────────────────
async function loadMessages() {
  const { data: messages, error } = await adminSupabase
    .from('messages').select('*').order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

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
