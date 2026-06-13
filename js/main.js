// ============================================================
// 1. ఎడమవైపు లిస్ట్‌లో బటన్లను జనరేట్ చేయడం
// ============================================================
const nav = document.getElementById('forms-list');
if (nav) {
    nav.innerHTML = "<h3>జనసేవ ఫారమ్స్ లిస్ట్</h3>";
    for (const code in window.FORM_REGISTRY) {
        const f = window.FORM_REGISTRY[code];
        nav.innerHTML += `<button onclick="loadForm('${code}')" class="nav-btn">📄 ${f.name}</button>`;
    }
}

// ============================================================
// 2. ఐఫ్రేమ్ ద్వారా ఫారమ్‌ను లోడ్ చేసే మెయిన్ ఇంజన్
// ============================================================
window.loadForm = function(code) {
    const form = window.FORM_REGISTRY[code];
    if (!form) return;

    const stage = document.getElementById('form-stage');
    if (stage) {
        stage.src = form.file;

        // ఫారమ్ పూర్తిగా ఐఫ్రేమ్ లోపల లోడ్ అయిన తర్వాత సాస్ టూల్స్ ఇంజెక్ట్ అవుతాయి
        stage.onload = function() {
            injectSaaSMatrix(stage.contentWindow.document);
        };
    }
};

// ============================================================
// 3. 🚀 కోర్ ఇంజెక్షన్ మ్యాట్రిక్స్ (అన్ని ఫారమ్ లకూ ఆటోమేటిక్ గా వస్తుంది)
// ============================================================
function injectSaaSMatrix(fDoc) {
    const docBody = fDoc.querySelector('.dbody, .doc-body, .a4-inner');
    const stampZone = fDoc.querySelector('.stamp, .stamp-zone, .bond-zone, .bond-zone-indicator');
    const a4Page = fDoc.querySelector('.a4, .a4-page');

    if (!docBody) return;

    // ── A. టాప్ సాస్ టూల్‌బార్ ఇంజెక్షన్ (No-Print) ──
    if (!fDoc.getElementById('saas-master-bar')) {
        const toolBar = fDoc.createElement('div');
        toolBar.id = 'saas-master-bar';
        toolBar.className = 'no-print';
        toolBar.style = `
            background: #0f172a; padding: 12px; display: flex; gap: 12px; 
            align-items: center; border-radius: 8px; margin-bottom: 20px; 
            font-family: 'Inter', sans-serif; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        toolBar.innerHTML = `
            <span style="font-weight:700; color:#e8a020; font-size:12px; letter-spacing:0.05em;">⚙️ JANA SEVA PRO TOOLS:</span>
            <button id="saas-lang-btn" style="background:#1a56a0; color:#fff; border:none; padding:6px 12px; font-size:11px; font-weight:600; border-radius:4px; cursor:pointer;">🌐 భాష మార్చండి (తెలుగు)</button>
            <div style="border-left:1px solid #334155; height:20px; margin:0 4px;"></div>
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; cursor:pointer; user-select:none;">
                <input type="checkbox" id="saas-bond-toggle" style="accent-color:#e8a020; width:14px; height:14px;"> 📜 Bond Paper Mode (No Stamp Space)
            </label>
        `;
        docBody.insertBefore(toolBar, docBody.firstChild);

        // ప్రింటింగ్ అప్పుడు ఈ టూల్‌బార్ మరియు కంట్రోలర్లు దాచడానికి CSS ఇంజెక్షన్
        const styleTag = fDoc.createElement('style');
        styleTag.textContent = `
            @media print { 
                .no-print, #saas-master-bar, #saas-upload-container, .logo-ctrls { display: none !important; } 
                .dbody, .doc-body, .a4-inner { padding-top: var(--saas-top-margin, 5.2in) !important; }
            }
        `;
        fDoc.head.appendChild(styleTag);

        // 📜 బాండ్ పేపర్ / స్టాంప్ పేపర్ టోగుల్ లాజిక్
        fDoc.getElementById('saas-bond-toggle').addEventListener('change', function(e) {
            if (e.target.checked) {
                // బాండ్ పేపర్ మోడ్: స్టాంప్ స్పేస్ హైడ్ అవుతుంది, మార్జిన్ సున్నా అవుతుంది
                if (stampZone) stampZone.style.setProperty('display', 'none', 'important');
                fDoc.documentElement.style.setProperty('--saas-top-margin', '15mm');
                docBody.style.paddingTop = '15mm';
            } else {
                // నార్మల్ మోడ్: 5.2" లేదా 3.5" స్పేస్ తిరిగి వస్తుంది
                if (stampZone) stampZone.style.display = '';
                fDoc.documentElement.style.setProperty('--saas-top-margin', '5.2in');
                docBody.style.paddingTop = '';
            }
        });

        // 🌐 వన్-క్లిక్ లాంగ్వేజ్ చేంజ్ కన్వర్టర్ (English ⇄ Telugu)
        let toggleState = false;
        fDoc.getElementById('saas-lang-btn').onclick = function() {
            toggleState = !toggleState;
            this.textContent = toggleState ? "🌐 Switch to English" : "🌐 భాష మార్చండి (తెలుగు)";
            
            // డాక్యుమెంట్ టైటిల్ మార్పిడి
            const dTitle = fDoc.querySelector('.dtitle, .doc-title, .legal-title');
            if (dTitle) {
                if (!dTitle.dataset.eng) dTitle.dataset.eng = dTitle.textContent;
                dTitle.textContent = toggleState ? "అఫిడవిట్" : dTitle.dataset.eng;
            }

            // పారాగ్రాఫ్‌లు మరియు క్లాజులు మార్పిడి
            fDoc.querySelectorAll('.clause span:not(.cl-n):not(.cl-num), p').forEach((el) => {
                if (!el.id && !el.classList.contains('doc-title') && !el.classList.contains('dtitle')) {
                    if (toggleState) {
                        if (!el.dataset.eng) el.dataset.eng = el.innerHTML;
                        el.innerHTML = el.innerHTML
                            .replace(/That I am the deponent herein/g, "నేను ఈ అఫిడవిట్ సమర్పిస్తున్న డిపోనెంట్‌ను")
                            .replace(/well acquainted with the facts/g, "ఇందులో పేర్కొన్న అన్ని నిజాలు నాకు పూర్తిగా తెలుసు")
                            .replace(/The above contents are true and correct/g, "పై విషయాలన్నీ నా జ్ఞానం మరియు నమ్మకం మేరకు నిజమైనవి")
                            .replace(/Sworn and signed before me/g, "నా సమక్షంలో ప్రమాణపూర్వకంగా సంతకం చేయబడినది")
                            .replace(/DEPONENT/g, "డిపోనెంట్ సంతకం");
                    } else {
                        if (el.dataset.eng) el.innerHTML = el.dataset.eng;
                    }
                }
            });
        };
    }

    // ── B. డ్రాగ్ అండ్ డ్రాప్ లోగో అప్‌లోడర్ ఇంజెక్షన్ ──
    if (!fDoc.getElementById('saas-upload-container')) {
        const uploadBox = fDoc.createElement('div');
        uploadBox.id = 'saas-upload-container';
        uploadBox.className = 'no-print';
        uploadBox.style = `
            border: 2px dashed #cbd5e1; padding: 14px; text-align: center; 
            background: #f8fafc; border-radius: 6px; cursor: pointer; 
            font-size: 12px; color: #64748b; margin-bottom: 20px; position: relative;
        `;
        uploadBox.innerHTML = `
            <div id="drop-text">📥 Drop Logo Here or Click to Upload</div>
            <input type="file" id="saas-logo-input" accept="image/*" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
        `;
        docBody.insertBefore(uploadBox, docBody.children[1]); // టూల్‌బార్ కింద పెడుతున్నాం

        // లోగో ప్రివ్యూ మరియు సైజ్ కంట్రోలర్ లేఅవుట్
        const previewWrap = fDoc.createElement('div');
        previewWrap.id = 'saas-preview-wrap';
        previewWrap.style = 'text-align:center; margin-bottom:20px; position:relative; display:none;';
        previewWrap.innerHTML = `
            <div style="position: relative; display: inline-block;">
                <img id="saas-img-render" src="" style="width:90px; height:auto; cursor:move;" draggable="true">
            </div>
            <div class="logo-ctrls no-print" style="margin-top: 6px;">
                <button id="logo-dec" style="padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer; margin-right:4px;">➖ Size</button>
                <button id="logo-inc" style="padding:3px 8px; font-size:11px; font-weight:600; cursor:pointer; margin-right:12px;">➕ Size</button>
                <button id="logo-del" style="padding:3px 8px; font-size:11px; color:#ef4444; background:none; border:1px solid #fee2e2; border-radius:4px; cursor:pointer;">🗑️ Delete</button>
            </div>
        `;
        docBody.insertBefore(previewWrap, docBody.children[2]);

        const fileInput = fDoc.getElementById('saas-logo-input');
        const imgRender = fDoc.getElementById('saas-img-render');

        function processFile(file) {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imgRender.src = e.target.result;
                    uploadBox.style.display = 'none';
                    previewWrap.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }

        // డ్రాగ్ అండ్ డ్రాప్ ఈవెంట్లు
        fileInput.addEventListener('change', (e) => processFile(e.target.files[0]));
        uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.style.background = '#f1f5f9'; uploadBox.style.borderColor = '#1a56a0'; });
        uploadBox.addEventListener('dragleave', () => { uploadBox.style.background = '#f8fafc'; uploadBox.style.borderColor = '#cbd5e1'; });
        uploadBox.addEventListener('drop', (e) => { e.preventDefault(); processFile(e.dataTransfer.files[0]); });

        // లోగో సైజ్ కంట్రోల్స్ లాజిక్
        fDoc.getElementById('logo-inc').onclick = () => { imgRender.style.width = (parseInt(imgRender.style.width || 90) + 10) + 'px'; };
        fDoc.getElementById('logo-dec').onclick = () => { imgRender.style.width = (parseInt(imgRender.style.width || 90) - 10) + 'px'; };
        fDoc.getElementById('logo-del').onclick = () => { previewWrap.style.display = 'none'; uploadBox.style.display = 'block'; imgRender.src = ''; };

        // ── C. లోగో డ్రాగ్ అండ్ డ్రాప్ పొజిషనింగ్ లాజిక్ (Move Anywhere inside A4) ──
        let isDragging = false, startX, startY, initialLeft = 0, initialTop = 0;
        imgRender.style.position = 'relative';
        imgRender.style.left = '0px'; imgRender.style.top = '0px';

        imgRender.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            initialLeft = parseInt(imgRender.style.left) || 0;
            initialTop = parseInt(imgRender.style.top) || 0;
            e.preventDefault();
        });

        fDoc.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            imgRender.style.left = (initialLeft + dx) + 'px';
            imgRender.style.top = (initialTop + dy) + 'px';
        });

        fDoc.addEventListener('mouseup', () => { isDragging = false; });
    }

    // ── D. ఇన్‌పుట్ ఈవెంట్ బైండర్స్ (లైవ్ సింక్ ఆటోమేటిక్ గా రన్ అవ్వడానికి) ──
    const inputs = fDoc.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => { if (typeof live === 'function') live(); });
        input.addEventListener('change', () => { if (typeof live === 'function') live(); });
    });
}

// ગ్లోబల్ వాల్యూ రీడర్ హెల్పర్
window.v = function(id) {
    const stage = document.getElementById('form-stage');
    if (stage && stage.contentWindow.document) {
        const el = stage.contentWindow.document.getElementById(id);
        return el ? el.value.trim() : '';
    }
    return '';
};
