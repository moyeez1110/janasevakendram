// ============================================================
// JANA SEVA KENDRA PRO — SaaS Engine v3.0 (Supabase Edition)
// Real auth: operators table | Real wallet: wallets table
// Real transactions: transactions table
// ============================================================

const SUPABASE_URL = 'https://llqqdmvptcjfaojjuwnq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lKowIgIVbDVC5DdqJkMUQw_ygl5vlhF';

const SESSION_KEY = 'jsk_saas_session';

// ── STATE ────────────────────────────────────────────────────
let state = {
  isAuthenticated: false,
  role: 'operator',
  operatorId: '',
  centerName: '',
  balance: 0,
};

// ── SUPABASE HELPERS ─────────────────────────────────────────
async function sbGet(table, filters = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbPatch(table, filters, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── SESSION PERSIST ──────────────────────────────────────────
function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    operatorId: state.operatorId,
    centerName: state.centerName,
    role:       state.role,
    balance:    state.balance,
  }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── BOOT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      const s = JSON.parse(saved);
      if (s && s.operatorId) {
        state.operatorId  = s.operatorId;
        state.centerName  = s.centerName || '';
        state.role        = s.role || 'operator';
        state.balance     = parseFloat(s.balance) || 0;
        state.isAuthenticated = true;
        // Refresh live balance from Supabase
        await refreshBalance();
        showPortal();
        return;
      }
    } catch(e) {}
  }
});

// ── AUTH ─────────────────────────────────────────────────────
window.handleLogin = async function() {
  const id  = document.getElementById('login-id').value.trim().toUpperCase();
  const pin = document.getElementById('login-pin').value.trim();
  const err = document.getElementById('login-error');
  const btn = document.querySelector('.login-btn');

  if (!id || !pin) {
    showLoginError('⚠️ Operator ID మరియు PIN enter చేయండి.');
    return;
  }

  btn.textContent = '⏳ Verifying…';
  btn.disabled = true;

  try {
    // Lookup operator by ID + PIN
    const rows = await sbGet('operators',
      `operator_id=eq.${encodeURIComponent(id)}&secure_pin=eq.${encodeURIComponent(pin)}&select=operator_id,center_name,secure_pin`
    );

    if (!rows || rows.length === 0) {
      showLoginError('🚫 Invalid Operator ID or PIN. దయచేసి మళ్ళీ ప్రయత్నించండి.');
      btn.textContent = '⚡ INITIALIZE SESSION';
      btn.disabled = false;
      return;
    }

    const op = rows[0];
    state.operatorId  = op.operator_id;
    state.centerName  = op.center_name || '';
    // Admin detection: if no wallet row exists or special prefix
    state.role = op.operator_id === 'ADMIN' ? 'admin' : 'operator';

    // Fetch wallet balance
    await refreshBalance();

    state.isAuthenticated = true;
    saveSession();
    err.classList.add('hidden');
    showPortal();
    showToast('⚡ Login successful — ' + state.operatorId);

  } catch(e) {
    showLoginError('🔌 Connection error: ' + e.message);
  }

  btn.textContent = '⚡ INITIALIZE SESSION';
  btn.disabled = false;
};

function showLoginError(msg) {
  const err = document.getElementById('login-error');
  const msgEl = document.getElementById('login-error-msg');
  if (msgEl) msgEl.textContent = msg;
  else err.textContent = msg;
  err.classList.remove('hidden');
}

window.handleLogout = function() {
  clearSession();
  state.isAuthenticated = false;
  state.operatorId = '';
  state.balance = 0;
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('form-stage').classList.add('hidden');
  document.getElementById('form-stage').src = 'about:blank';
  document.getElementById('empty-state').classList.remove('hidden');
  document.getElementById('login-pin').value = '';
  document.getElementById('login-id').value = '';
};

// ── WALLET ───────────────────────────────────────────────────
async function refreshBalance() {
  try {
    const rows = await sbGet('wallets',
      `operator_id=eq.${encodeURIComponent(state.operatorId)}&select=balance`
    );
    if (rows && rows.length > 0) {
      state.balance = parseFloat(rows[0].balance) || 0;
    } else {
      state.balance = 0;
    }
    saveSession();
    updateWalletUI();
  } catch(e) {
    console.warn('Balance refresh failed:', e.message);
  }
}

window.updateWalletUI = function() {
  const el = document.getElementById('wallet-balance');
  if (el) {
    el.textContent = '₹' + state.balance.toFixed(2);
    el.className = state.balance < 5
      ? 'text-red-400 font-bold font-mono text-sm'
      : 'text-emerald-400 font-bold font-mono text-sm';
  }
};

window.adminRecharge = async function() {
  const input = document.getElementById('recharge-target-id');
  const amtEl = document.getElementById('recharge-amt');
  const targetId = input ? input.value.trim().toUpperCase() : state.operatorId;
  const amt = parseFloat(amtEl.value);

  if (!amt || amt <= 0) { showToast('⚠️ Valid amount enter చేయండి'); return; }
  if (!targetId) { showToast('⚠️ Operator ID enter చేయండి'); return; }

  try {
    // Fetch current balance
    const rows = await sbGet('wallets',
      `operator_id=eq.${encodeURIComponent(targetId)}&select=balance,wallet_id`
    );
    if (!rows || rows.length === 0) {
      showToast('🚫 Wallet not found for ' + targetId);
      return;
    }
    const newBalance = parseFloat(rows[0].balance) + amt;
    await sbPatch('wallets',
      `operator_id=eq.${encodeURIComponent(targetId)}`,
      { balance: newBalance, updated_at: new Date().toISOString() }
    );

    // If recharging own wallet, update local state
    if (targetId === state.operatorId) {
      state.balance = newBalance;
      saveSession();
      updateWalletUI();
    }

    amtEl.value = '';
    if (input) input.value = '';
    showToast('✅ ₹' + amt.toFixed(2) + ' credited to ' + targetId);
  } catch(e) {
    showToast('❌ Recharge failed: ' + e.message);
  }
};

// Print request — called from injected iframe button
window.requestPrint = function(cost, formName) {
  cost = parseFloat(cost) || 5;
  if (state.role === 'admin') {
    triggerIframePrint();
    return;
  }
  if (state.balance < cost) {
    showToast('🚫 Insufficient balance! ₹' + cost.toFixed(2) + ' required. Current: ₹' + state.balance.toFixed(2));
    return;
  }
  document.getElementById('popup-form-name').textContent = formName || 'Affidavit';
  document.getElementById('popup-cost').textContent      = '₹' + cost.toFixed(2);
  document.getElementById('popup-after').textContent     = '₹' + (state.balance - cost).toFixed(2);
  document.getElementById('print-popup').classList.remove('hidden');
  window._pendingPrintCost = cost;
  window._pendingFormName  = formName;
};

window.confirmPrint = async function() {
  const cost     = window._pendingPrintCost || 5;
  const formName = window._pendingFormName  || 'Affidavit';
  const formCode = window._pendingFormCode  || 'UNKNOWN';

  document.getElementById('print-popup').classList.add('hidden');

  try {
    // 1. Deduct from wallet in Supabase
    const newBalance = state.balance - cost;
    await sbPatch('wallets',
      `operator_id=eq.${encodeURIComponent(state.operatorId)}`,
      { balance: newBalance, updated_at: new Date().toISOString() }
    );

    // 2. Insert transaction record
    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    await sbPost('transactions', {
      transaction_id:   txnId,
      operator_id:      state.operatorId,
      form_code:        formCode,
      amount_deducted:  cost,
      timestamp:        new Date().toISOString(),
    });

    // 3. Update local state
    state.balance = newBalance;
    saveSession();
    updateWalletUI();
    showToast('💸 ₹' + cost.toFixed(2) + ' debited [' + txnId + ']. Printing…');
    setTimeout(triggerIframePrint, 300);

  } catch(e) {
    showToast('❌ Transaction failed: ' + e.message);
  }
};

window.cancelPrint = function() {
  document.getElementById('print-popup').classList.add('hidden');
};

function triggerIframePrint() {
  const stage = document.getElementById('form-stage');
  try { stage.contentWindow.print(); } catch(e) { window.print(); }
}

// ── PORTAL INIT ──────────────────────────────────────────────
function showPortal() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('user-display').textContent = state.centerName || state.operatorId;

  if (state.role === 'admin') {
    document.getElementById('admin-panel').classList.remove('hidden');
    document.getElementById('wallet-widget').classList.add('hidden');
  } else {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('wallet-widget').classList.remove('hidden');
  }

  updateWalletUI();
  loadTxnLog();
  initFormList();
}

// ── TRANSACTION LOG (from Supabase) ─────────────────────────
async function loadTxnLog() {
  const el = document.getElementById('txn-log');
  if (!el) return;
  el.innerHTML = '<div style="font-size:.68rem;color:#4a4f65;text-align:center;padding:10px;">Loading…</div>';
  try {
    const rows = await sbGet('transactions',
      `operator_id=eq.${encodeURIComponent(state.operatorId)}&order=timestamp.desc&limit=20&select=transaction_id,form_code,amount_deducted,timestamp`
    );
    if (!rows || rows.length === 0) {
      el.innerHTML = '<div style="font-size:.68rem;color:#4a4f65;text-align:center;padding:10px;">No transactions yet.</div>';
      return;
    }
    el.innerHTML = rows.map(t => {
      const d = new Date(t.timestamp);
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        + ' · ' + d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return `<div style="display:flex;align-items:center;gap:8px;background:rgba(15,17,23,.6);border:1px solid #1e2130;border-radius:6px;padding:8px;font-size:.68rem;margin-bottom:4px;">
        <span>🖨️</span>
        <div style="flex:1;color:#94a3b8;">${t.form_code}<div style="color:#4a4f65;font-size:.6rem;">${time}</div></div>
        <span style="color:#e05252;font-family:'JetBrains Mono',monospace;font-weight:700;">–₹${parseFloat(t.amount_deducted).toFixed(2)}</span>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="font-size:.68rem;color:#e05252;padding:6px;">Failed to load: ' + e.message + '</div>';
  }
}

// ── FORM LIST ─────────────────────────────────────────────────
function initFormList() {
  renderFormList('');
}

window.filterForms = function() {
  const q = document.getElementById('search-forms').value.toLowerCase();
  renderFormList(q);
};

function renderFormList(query) {
  const nav = document.getElementById('forms-list');
  nav.innerHTML = '';
  const groups = {};
  for (const code in window.FORM_REGISTRY) {
    const f = window.FORM_REGISTRY[code];
    if (!f.name.toLowerCase().includes(query) && !f.category.toLowerCase().includes(query)) continue;
    if (!groups[f.category]) groups[f.category] = [];
    groups[f.category].push({ code, ...f });
  }
  for (const cat in groups) {
    const catDiv = document.createElement('div');
    catDiv.className = 'mb-3';
    catDiv.innerHTML = `<div class="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-2 mb-1">${cat}</div>`;
    groups[cat].forEach(f => {
      const btn = document.createElement('button');
      btn.id = 'form-btn-' + f.code;
      btn.className = 'w-full text-left text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg px-3 py-2 text-xs transition-colors flex items-center gap-2 group';
      btn.innerHTML = `<span>${f.icon}</span><span class="flex-1 truncate">${f.name}</span><span class="text-[9px] text-slate-600 group-hover:text-amber-500/70 font-mono">₹${f.cost}</span>`;
      btn.onclick = () => loadForm(f.code);
      catDiv.appendChild(btn);
    });
    nav.appendChild(catDiv);
  }
}

// ── LOAD FORM ─────────────────────────────────────────────────
let _activeCode = null;

window.loadForm = function(code) {
  const item = window.FORM_REGISTRY[code];
  if (!item) return;
  _activeCode = code;
  window._pendingFormCode = code;

  document.querySelectorAll('[id^="form-btn-"]').forEach(b => {
    b.classList.toggle('bg-slate-800', b.id === 'form-btn-' + code);
    b.classList.toggle('text-white',   b.id === 'form-btn-' + code);
  });

  const bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = item.name;

  document.getElementById('empty-state').classList.add('hidden');
  const stage = document.getElementById('form-stage');
  stage.classList.remove('hidden');
  stage.src = item.file;

  stage.onload = function() {
    try {
      injectSaaSControls(stage.contentDocument || stage.contentWindow.document, item);
    } catch(e) {
      console.warn('Injection skipped:', e.message);
    }
  };
};

// ── INJECTION ENGINE ──────────────────────────────────────────
function injectSaaSControls(fDoc, formItem) {
  if (!fDoc || !fDoc.body) return;
  const docBody = fDoc.querySelector('.dbody, .a4-inner, .doc-body');
  if (!docBody) return;

  if (!fDoc.getElementById('jsk-toolbar')) {
    const style = fDoc.createElement('style');
    style.textContent = `
      @media print {
        #jsk-toolbar, #jsk-logo-zone, #jsk-logo-controls { display:none!important; }
        #jsk-logo-img { display:block!important; }
      }
      #jsk-logo-img { display:none; }
      #jsk-logo-img.visible { display:block; }
      #jsk-logo-zone.dragover { border-color:#e8b84b!important; background:#fffbf0!important; }
    `;
    fDoc.head.appendChild(style);

    const bar = fDoc.createElement('div');
    bar.id = 'jsk-toolbar';
    bar.style.cssText = 'background:#0f172a;color:#fff;padding:8px 12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-radius:8px;margin-bottom:14px;font-family:sans-serif;font-size:11px;';
    bar.innerHTML = `
      <span style="color:#e8b84b;font-weight:700;letter-spacing:.04em;">⚙️ JSK Controls:</span>
      <button id="jsk-lang-btn" style="background:#1a56a0;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">🌐 తెలుగు</button>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;">
        <input type="checkbox" id="jsk-bond-chk" style="accent-color:#e8b84b;width:13px;height:13px;">
        📜 Bond Paper
      </label>
      <div style="flex:1"></div>
      <button id="jsk-print-btn" style="background:#e8b84b;color:#0f1117;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;">🖨️ Print ₹${formItem.cost}</button>
    `;
    docBody.insertBefore(bar, docBody.firstChild);

    const stamp = fDoc.querySelector('.stamp, .stamp-zone, .bond-zone');
    fDoc.getElementById('jsk-bond-chk').addEventListener('change', function() {
      if (this.checked) {
        if (stamp) stamp.style.setProperty('display', 'none', 'important');
        docBody.style.paddingTop = '14mm';
      } else {
        if (stamp) stamp.style.display = '';
        docBody.style.paddingTop = '';
      }
    });

    let langTE = false;
    fDoc.getElementById('jsk-lang-btn').addEventListener('click', function() {
      langTE = !langTE;
      this.textContent = langTE ? '🌐 English' : '🌐 తెలుగు';
      fDoc.querySelectorAll('[data-en]').forEach(el => {
        if (langTE && el.dataset.te) el.innerHTML = el.dataset.te;
        else if (!langTE && el.dataset.en) el.innerHTML = el.dataset.en;
      });
      const title = fDoc.querySelector('.dtitle, #doc-title');
      if (title) {
        if (!title.dataset.en) title.dataset.en = title.textContent;
        title.textContent = langTE ? (title.dataset.te || 'అఫిడవిట్') : title.dataset.en;
      }
    });

    fDoc.getElementById('jsk-print-btn').addEventListener('click', function() {
      try {
        window.parent.requestPrint(formItem.cost, formItem.name);
      } catch(e) {
        fDoc.defaultView.print();
      }
    });

    fDoc.querySelectorAll('button').forEach(btn => {
      if (btn.id === 'jsk-print-btn') return;
      const txt = (btn.textContent || '').toLowerCase();
      if (txt.includes('print') || txt.includes('ప్రింట్')) {
        btn.onclick = function(e) {
          e.preventDefault(); e.stopPropagation();
          try { window.parent.requestPrint(formItem.cost, formItem.name); }
          catch(ex) { fDoc.defaultView.print(); }
        };
      }
    });
  }

  if (!fDoc.getElementById('jsk-logo-zone')) {
    const logoWrap = fDoc.createElement('div');
    logoWrap.style.cssText = 'margin-bottom:12px;font-family:sans-serif;';
    logoWrap.innerHTML = `
      <div id="jsk-logo-zone" style="border:2px dashed #cbd5e1;padding:14px;text-align:center;background:#f8fafc;border-radius:6px;cursor:pointer;font-size:11px;color:#64748b;position:relative;transition:border-color .2s,background .2s;">
        <div>🖼️ Drag &amp; Drop Logo / Click to Upload</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">PNG · JPG · SVG</div>
        <input type="file" id="jsk-logo-file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
      </div>
      <img id="jsk-logo-img" src="" alt="Logo" style="max-height:70px;max-width:220px;object-fit:contain;display:none;margin:6px auto;border-radius:4px;">
      <div id="jsk-logo-controls" style="display:none;flex-direction:row;gap:6px;margin-top:6px;align-items:center;font-size:11px;">
        <button id="jsk-dec" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:4px;cursor:pointer;">➖ Size</button>
        <button id="jsk-inc" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:4px;cursor:pointer;">➕ Size</button>
        <button id="jsk-del" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:5px;padding:4px 8px;cursor:pointer;">✕</button>
      </div>`;
    docBody.insertBefore(logoWrap, docBody.firstChild);

    const zone = fDoc.getElementById('jsk-logo-zone');
    const fileInp = fDoc.getElementById('jsk-logo-file');
    const img = fDoc.getElementById('jsk-logo-img');
    const controls = fDoc.getElementById('jsk-logo-controls');
    let logoH = 70;

    function mountLogo(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        img.src = e.target.result;
        img.style.display = 'block';
        img.style.maxHeight = logoH + 'px';
        img.classList.add('visible');
        zone.style.display = 'none';
        controls.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }

    fileInp.addEventListener('change', e => mountLogo(e.target.files[0]));
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop',      e => { e.preventDefault(); zone.classList.remove('dragover'); mountLogo(e.dataTransfer.files[0]); });

    fDoc.getElementById('jsk-inc').addEventListener('click', () => { logoH = Math.min(200, logoH + 10); img.style.maxHeight = logoH + 'px'; });
    fDoc.getElementById('jsk-dec').addEventListener('click', () => { logoH = Math.max(24, logoH - 10); img.style.maxHeight = logoH + 'px'; });
    fDoc.getElementById('jsk-del').addEventListener('click', () => {
      img.src = ''; img.style.display = 'none'; img.classList.remove('visible');
      zone.style.display = ''; controls.style.display = 'none';
    });
  }
}

// ── TOAST ────────────────────────────────────────────────────
window.showToast = function(msg) {
  const t = document.getElementById('saas-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3500);
};
