// ================================================
// PORTFOLIO — Main JS
// ================================================

const API_URL = '';

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  await loadProjects();
  trackPageView();
  initScrollReveal();
  initSmoothScroll();
  initModalEscape();
});

async function loadProfile() {
  try {
    const res = await fetch(`${API_URL}/api/profile`);
    const p = await res.json();
    if (!p) return;

    if (p.tagline) document.getElementById('heroTagline').textContent = p.tagline;
    if (p.availability) document.getElementById('heroAvailability').textContent = '// ' + p.availability;

    if (p.years_experience) {
      document.getElementById('statYears').innerHTML = p.years_experience + '<span>+</span>';
      document.getElementById('badgeYears').textContent = p.years_experience;
    }
    if (p.projects_shipped) document.getElementById('statProjects').innerHTML = p.projects_shipped + '<span>+</span>';
    if (p.happy_clients) document.getElementById('statClients').innerHTML = p.happy_clients + '<span>+</span>';

    if (p.bio && p.bio.length > 0) {
      document.getElementById('bioParagraphs').innerHTML = p.bio.map(para => `<p>${para}</p>`).join('');
    }

    if (p.skills && p.skills.length > 0) {
      document.getElementById('skillsGrid').innerHTML = p.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
    }

    if (p.github_url) document.getElementById('linkGithub').href = p.github_url;
    if (p.linkedin_url) document.getElementById('linkLinkedin').href = p.linkedin_url;
    if (p.instagram_url) document.getElementById('linkInstagram').href = p.instagram_url;
    if (p.whatsapp_url) document.getElementById('linkWhatsapp').href = p.whatsapp_url;
    if (p.email) document.getElementById('linkEmail').href = 'mailto:' + p.email;

    if (p.experience && p.experience.length > 0) {
      const sorted = [...p.experience].sort((a, b) => a.order - b.order);
      document.getElementById('experienceList').innerHTML = sorted.map(exp => `
        <div class="exp-item reveal">
          <div class="exp-year">${exp.years}</div>
          <div>
            <div class="exp-role">${exp.role}</div>
            <div class="exp-company">${exp.company}</div>
            <div class="exp-desc">${exp.description}</div>
          </div>
        </div>`).join('');
      initScrollReveal();
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

async function loadProjects() {
  try {
    const res = await fetch(`${API_URL}/api/projects`);
    const projects = await res.json();
    if (!projects || projects.length === 0) { loadHardcodedProjects(); return; }

    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = projects.map((p, i) => `
      <div class="project-card reveal" style="transition-delay:${i * 0.1}s">
        <div class="project-img" style="${p.gradient || 'background:linear-gradient(135deg,#0f2850,#1e40af)'}">
          ${p.emoji || '🚀'}
        </div>
        <div class="project-body">
          <div class="project-tags">
            ${(p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('')}
          </div>
          <h3 class="project-title">${p.title}</h3>
          <p class="project-desc">${p.description}</p>
          <a href="#" class="project-link" onclick="openProjectModal('${p.id}'); return false;">View Case Study →</a>
        </div>
      </div>`).join('');

    const oldModals = document.querySelectorAll('.modal-overlay[id^="modal-"]');
    oldModals.forEach(m => m.remove());

    const modalContainer = document.createElement('div');
    modalContainer.id = 'dynamicModal';
    modalContainer.className = 'modal-overlay';
    modalContainer.innerHTML = `
      <div class="modal-box">
        <div class="modal-hero" id="dynModalHero">🚀</div>
        <div class="modal-body" id="dynModalBody"></div>
        <div class="modal-header" style="border-top:1px solid var(--border);border-bottom:none;padding-top:1.25rem;">
          <span></span><button class="modal-close" onclick="closeDynModal()">✕</button>
        </div>
      </div>`;
    modalContainer.onclick = (e) => { if (e.target === modalContainer) closeDynModal(); };
    document.body.appendChild(modalContainer);
    initScrollReveal();
  } catch (err) {
    console.error('Failed to load projects:', err);
    loadHardcodedProjects();
  }
}

async function openProjectModal(projectId) {
  try {
    const res = await fetch(`${API_URL}/api/projects/${projectId}`);
    const p = await res.json();
    if (!p) return;
    fetch(`${API_URL}/api/projects/${projectId}/view`, { method: 'POST' }).catch(() => {});
    const cs = p.case_study || {};
    document.getElementById('dynModalHero').style = p.gradient || 'background:linear-gradient(135deg,#0f2850,#1e40af)';
    document.getElementById('dynModalHero').textContent = p.emoji || '🚀';
    document.getElementById('dynModalBody').innerHTML = `
      <div class="modal-tags">${(p.tags || []).map(t => `<span class="modal-tag">${t}</span>`).join('')}</div>
      <h2 class="modal-title">${p.title}</h2>
      <p class="modal-subtitle">${cs.subtitle || ''}</p>
      <p>${cs.overview || p.description}</p>
      ${cs.whatIBuilt && cs.whatIBuilt.length > 0 ? `
        <div class="modal-section-title">// What I Built</div>
        <ul class="modal-bullets">
          ${cs.whatIBuilt.map(item => `<li>${item}</li>`).join('')}
        </ul>` : ''}
      ${cs.outcome ? `
        <div class="modal-section-title">// Outcome</div>
        <p>${cs.outcome}</p>` : ''}`;
    document.getElementById('dynamicModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Failed to open project modal:', err);
  }
}

function closeDynModal() {
  const modal = document.getElementById('dynamicModal');
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

function loadHardcodedProjects() {
  document.getElementById('projectsGrid').innerHTML = `
    <div class="project-card reveal">
      <div class="project-img" style="background:linear-gradient(135deg,#0f2850,#1e40af)">🚀</div>
      <div class="project-body">
        <div class="project-tags"><span class="project-tag">AWS</span><span class="project-tag">Docker</span></div>
        <h3 class="project-title">Cloud Infrastructure Platform</h3>
        <p class="project-desc">Scalable cloud infrastructure built on AWS with Kubernetes orchestration.</p>
      </div>
    </div>`;
}

function trackPageView() {
  fetch(`${API_URL}/api/analytics/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: '/' })
  }).catch(() => {});
}

function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}
function closeModalOutside(event, id) {
  if (event.target === document.getElementById('modal-' + id)) closeModal(id);
}
function initModalEscape() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      closeDynModal();
      document.body.style.overflow = '';
    }
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal:not(.visible)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
}

async function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  if (!name || !email || !subject || !message) {
    btn.textContent = 'Please fill all fields!';
    btn.style.background = '#f59e0b';
    setTimeout(() => { btn.textContent = 'Send Message →'; btn.style.background = ''; }, 2500);
    return;
  }
  btn.textContent = 'Sending…'; btn.disabled = true;
  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message })
    });
    const data = await res.json();
    if (res.ok) {
      btn.textContent = 'Message Sent! ✓';
      btn.style.background = '#059669';
      e.target.reset();
    } else {
      btn.textContent = data.error || 'Something went wrong';
      btn.style.background = '#ef4444';
    }
  } catch (err) {
    btn.textContent = 'Could not connect to server';
    btn.style.background = '#ef4444';
  }
  btn.disabled = false;
  setTimeout(() => { btn.textContent = 'Send Message →'; btn.style.background = ''; }, 3500);
}