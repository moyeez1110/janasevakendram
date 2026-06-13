// ── STATE ──────────────────────────────────────────────────
let activeCode = null;

// ── SEARCH ─────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    document.querySelectorAll('.nav-form-btn').forEach(btn => {
      const name = btn.dataset.name.toLowerCase();
      btn.closest('.nav-item').style.display = name.includes(q) ? '' : 'none';
    });
    // Show/hide category headers based on visible children
    document.querySelectorAll('.nav-category').forEach(cat => {
      const anyVisible = [...cat.querySelectorAll('.nav-item')].some(i => i.style.display !== 'none');
      cat.style.display = anyVisible ? '' : 'none';
    });
  });
}

// ── BUILD NAV ───────────────────────────────────────────────
function buildNav() {
  const nav = document.getElementById('forms-list');
  if (!nav) return;

  // Group forms by category
  const groups = {};
  for (const code in window.FORM_REGISTRY) {
    const f = window.FORM_REGISTRY[code];
    if (!groups[f.category]) groups[f.category] = [];
    groups[f.category].push({ code, ...f });
  }

  let html = '';
  for (const catKey in groups) {
    const catInfo = window.FORM_CATEGORIES[catKey] || { label: catKey, color: '#64748b' };
    html += `<div class="nav-category">
      <div class="nav-cat-label" style="--cat-color:${catInfo.color}">${catInfo.label}</div>`;
    for (const f of groups[catKey]) {
      html += `<div class="nav-item">
        <button class="nav-form-btn" data-code="${f.code}" data-name="${f.name}" onclick="loadForm('${f.code}')">
          <span class="nav-icon">${f.icon}</span>
          <span class="nav-label">${f.name}</span>
          <span class="nav-arrow">›</span>
        </button>
      </div>`;
    }
    html += `</div>`;
  }
  nav.innerHTML = html;
}

buildNav();

// ── LOAD FORM ───────────────────────────────────────────────
window.loadForm = function (code) {
  const form = window.FORM_REGISTRY[code];
  if (!form) return;

  activeCode = code;

  // Update active state in nav
  document.querySelectorAll('.nav-form-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.code === code);
  });

  // Update breadcrumb
  const bc = document.getElementById('breadcrumb-name');
  if (bc) bc.textContent = form.name;

  // Show loading state
  const stage = document.getElementById('form-stage');
  const placeholder = document.getElementById('stage-placeholder');
  if (placeholder) placeholder.style.display = 'none';
  if (stage) {
    stage.style.opacity = '0';
    stage.src = form.file;
    stage.onload = () => {
      stage.style.transition = 'opacity 0.25s ease';
      stage.style.opacity = '1';
    };
  }

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar')?.classList.remove('open');
  }
};

// ── MOBILE SIDEBAR TOGGLE ───────────────────────────────────
window.toggleSidebar = function () {
  document.getElementById('sidebar')?.classList.toggle('open');
};
