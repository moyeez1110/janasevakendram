// ============================================================
// JANA SEVA KENDRA PRO — Core SaaS Engine Module v2.5
// Features: Dynamic Iframe Injection, Cross-Frame Session Lock,
//           Universal Dictionary Engine, Wallet Token Auditor.
// ============================================================

const CREDENTIALS = {
  'CSC-AP-001': { pin: '1234', role: 'operator' },
  'CSC-TS-001': { pin: '5678', role: 'operator' },
  'ADMIN':      { pin: '9999', role: 'admin'    },
};

const SESSION_KEY = 'jsk_saas_session';
const TXN_KEY     = 'jsk_saas_txn';

let state = {
  isAuthenticated: false,
  role: 'operator',
  operatorId: '',
  balance: 150.00,
  transactions: [],
};

function saveState() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    operatorId: state.operatorId,
    role:        state.role,
    balance:     state.balance,
  }));
  sessionStorage.setItem(TXN_KEY, JSON.stringify(state.transactions));
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && CREDENTIALS[s.operatorId]) {
        state.operatorId     = s.operatorId;
        state.role           = s.role;
        state.balance        = parseFloat(s.balance) || 0;
        state.isAuthenticated = true;
      }
    }
    const txnRaw = sessionStorage.getItem(TXN_KEY);
    if (txnRaw) state.transactions = JSON.parse(txnRaw);
  } catch(e) {}
}

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  if (state.isAuthenticated) showPortal();
});

window.handleLogin = function() {
  const id  = document.getElementById('login-id').value.trim().toUpperCase();
  const pin = document.getElementById('login-pin').value.trim();
  const err = document.getElementById('login-error');

  const cred = CREDENTIALS[id];
  if (!cred || cred.pin !== pin) {
    err.classList.remove('hidden');
    return;
  }

  err.classList.add('hidden');
  state.isAuthenticated = true;
  state.operatorId = id;
  state.role       = cred.role;

  if (!sessionStorage.getItem(SESSION_KEY)) state.balance = 150.00;
  saveState();
  showPortal();
  showToast('⚡ Authorization Successful: ' + id);
};

window.handleLogout = function() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TXN_KEY);
  state.isAuthenticated = false;
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('form-stage').classList.add('hidden');
  document.getElementById('form-stage').src = 'about:blank';
  document.getElementById('empty-state').classList.remove('hidden');
  document.getElementById('login-pin').value = '';
};

function showPortal() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('user-display').textContent = state.operatorId;

  if (state.role === 'admin') {
    document.getElementById('admin-panel').classList.remove('hidden');
    document.getElementById('wallet-widget').classList.add('hidden');
  } else {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('wallet-widget').classList.remove('hidden');
  }

  updateWalletUI();
  renderTxnLog();
  initFormList();
}

window.updateWalletUI = function() {
  const el = document.getElementById('wallet-balance');
  if (el) {
    el.textContent = '₹' + state.balance.toFixed(2);
    el.className = state.balance < 5 ? 'text-red-400 font-bold font-mono text-sm' : 'text-emerald-400 font-bold font-mono text-sm';
  }
};

window.adminRecharge = function() {
  const input = document.getElementById('recharge-amt');
  const amt   = parseFloat(input.value);
  if (!amt || amt <= 0) { showToast('⚠️ Enter valid token amount'); return; }
  state.balance += amt;
  saveState();
  updateWalletUI();
  input.value = '';
  showToast('✅ Account Credited: ₹' + amt.toFixed(2));
};

window.requestPrint = function(cost, formName) {
  cost = parseFloat(cost) || 5;
  if (state.role === 'admin') {
    triggerIframePrint();
    return;
  }
  if (state.balance < cost) {
    showToast('🚫 Insufficient Balance! Minimum ₹' + cost.toFixed(2) + ' required.');
    return;
  }
  document.getElementById('popup-form-name').textContent = formName || 'Affidavit';
  document.getElementById('popup-cost').textContent      = '₹' + cost.toFixed(2);
  document.getElementById('popup-after').textContent     = '₹' + (state.balance - cost).toFixed(2);
  document.getElementById('print-popup').classList.remove('hidden');
  window._pendingPrintCost = cost;
  window._pendingFormName  = formName;
};

window.confirmPrint = function() {
  const cost     = window._pendingPrintCost || 5;
  const formName = window._pendingFormName  || 'Affidavit';
  document.getElementById('print-popup').classList.add('hidden');

  state.balance -= cost;
  const now = new Date();
  state.transactions.unshift({
    form:   formName,
    amount: cost,
    time:   now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          + ' · ' + now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  });
  saveState();
  updateWalletUI();
  renderTxnLog();
  showToast('💸 Token Debited. Printing Document…');
  setTimeout(triggerIframePrint, 300);
};

window.cancelPrint = function() {
  document.getElementById('print-popup').classList.add('hidden');
};

function triggerIframePrint() {
  const stage = document.getElementById('form-stage');
  try { stage.contentWindow.print(); } catch(e) { window.print(); }
}

function renderTxnLog() {
  const el = document.getElementById('txn-log');
  if (!el) return;
  if (state.transactions.length === 0) {
    el.innerHTML = '<div class="text-xs text-slate-500 text-center py-3">No logs recorded.</div>';
    return;
  }
  el.innerHTML = state.transactions.slice(0, 20).map(t => `
    <div class="flex items-center gap-2 bg-slate-950/60 rounded p-2 text-xs">
      <span>🖨️</span>
      <div class="flex-1 text-slate-300">${t.form}<div class="text-slate-500 text-[10px]">${t.time}</div></div>
      <span class="text-red-400 font-bold font-mono">–₹${t.amount.toFixed(2)}</span>
    </div>`).join('');
}

function initFormList() { renderFormList(''); }

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

window.loadForm = function(code) {
  const item = window.FORM_REGISTRY[code];
  if (!item) return;

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
    } catch(e) { console.warn('Injection Error:', e.message); }
  };
};

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
        <input type="checkbox" id="jsk-bond-chk" style="accent-color:#e8b84b;width:13px;height:13px;">📜 Bond Paper Mode
      </label>
      <div style="flex:1"></div>
      <button id="jsk-print-btn" style="background:#e8b84b;color:#0f1117;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;">🖨️ Print Request</button>
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
    const DICTIONARY = {
      "AFFIDAVIT": "అఫిడవిట్", "VERIFICATION": "ధృవీకరణ", "DEPONENT": "డిపోనెంట్ సంతకం",
      "That I am the deponent herein and as such well acquainted with the facts of this Affidavit and fit to depose as under.": "నేను ఇక్కడ డెపోనెంట్‌ని మరియు ఈ అఫిడవిట్ విషయాలు నాకు బాగా తెలుసు.",
      "The above contents are true and correct to the best of my knowledge, belief and trust.": "పైన పేర్కొన్న విషయాలన్నీ నా జ్ఞానం, విశ్వాసం మరియు నమ్మకానికి నిజమైనవి మరియు సరైనవి.",
      "Sworn and signed before me": "నా సమక్షంలో ప్రమాణపూర్వకంగా సంతకం చేయబడినది",
      "NOTARY / 1ST CLASS MAGISTRATE": "నోటరీ / ఫస్ట్ క్లాస్ మెజిస్ట్రేట్"
    };

    fDoc.getElementById('jsk-lang-btn').addEventListener('click', function() {
      langTE = !langTE;
      this.textContent = langTE ? '🌐 English Mode' : '🌐 భాష మార్చండి (తెలుగు)';

      fDoc.querySelectorAll('[data-en]').forEach(el => {
        if (langTE && el.dataset.te) el.innerHTML = el.dataset.te;
        else if (!langTE && el.dataset.en) el.innerHTML = el.dataset.en;
      });

      fDoc.querySelectorAll('p, span').forEach(el => {
        if(el.children.length === 0 && DICTIONARY[el.textContent.trim()]) {
          if(langTE) {
            el.dataset.backup = el.textContent.trim();
            el.textContent = DICTIONARY[el.textContent.trim()];
          } else if(el.dataset.backup) {
            el.textContent = el.dataset.backup;
          }
        }
      });

      const title = fDoc.querySelector('.dtitle, #doc-title');
      if (title) {
        if (!title.dataset.en) title.dataset.en = title.textContent;
        title.textContent = langTE ? (title.dataset.te || 'అఫిడవిట్') : title.dataset.en;
      }
    });

    fDoc.getElementById('jsk-print-btn').addEventListener('click', function() {
      try { window.parent.requestPrint(formItem.cost, formItem.name); } catch(e) { fDoc.defaultView.print(); }
    });
  }

  // ── 2. Intelligent Drag & Drop Logo Core ──
  if (!fDoc.getElementById('jsk-logo-zone')) {
    const logoWrap = fDoc.createElement('div');
    logoWrap.style.cssText = 'margin-bottom:12px;font-family:sans-serif;';
    logoWrap.innerHTML = `
      <div id="jsk-logo-zone" style="border:2px dashed #cbd5e1;padding:14px;text-align:center;background:#f8fafc;border-radius:6px;cursor:pointer;font-size:11px;color:#64748b;position:relative;transition:border-color .2s,background .2s;">
        <div>🖼️ Drop Organization Logo Here / Click to Upload</div>
        <input type="file" id="jsk-logo-file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
      </div>
      <img id="jsk-logo-img" src="" alt="Logo Node" style="max-height:70px;max-width:220px;object-fit:contain;display:none;margin:6px auto;border-radius:4px;">
      <div id="jsk-logo-controls" style="display:none;flex-direction:row;gap:6px;margin-top:6px;align-items:center;font-size:11px;">
        <button id="jsk-dec" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:4px;cursor:pointer;">➖ Size</button>
        <button id="jsk-inc" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:4px;cursor:pointer;">➕ Size</button>
        <button id="jsk-del" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:5px;padding:4px 8px;cursor:pointer;">✕</button>
      </div>`;

    docBody.insertBefore(logoWrap, docBody.firstChild);

    const zone     = fDoc.getElementById('jsk-logo-zone');
    const fileInp  = fDoc.getElementById('jsk-logo-file');
    const img      = fDoc.getElementById('jsk-logo-img');
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
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor='#e8b84b'; });
    zone.addEventListener('dragleave', () => zone.style.borderColor='#cbd5e1');
    zone.addEventListener('drop',      e => { e.preventDefault(); mountLogo(e.dataTransfer.files[0]); });

    fDoc.getElementById('jsk-inc').addEventListener('click', () => { logoH = Math.min(200, logoH + 10); img.style.maxHeight = logoH + 'px'; });
    fDoc.getElementById('jsk-dec').addEventListener('click', () => { logoH = Math.max(24, logoH - 10); img.style.maxHeight = logoH + 'px'; });
    fDoc.getElementById('jsk-del').addEventListener('click', () => { img.src = ''; img.style.display = 'none'; zone.style.display = ''; controls.style.display = 'none'; });
  }

  // Hook all inputs inside iframe to sync live
  const inputs = fDoc.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', () => { if (fDoc.defaultView.live) fDoc.defaultView.live(); });
    input.addEventListener('change', () => { if (fDoc.defaultView.live) fDoc.defaultView.live(); });
  });
}

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
  }, 3000);
};
