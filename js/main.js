// 1. ఎడమవైపు లిస్ట్‌లో బటన్లను జనరేట్ చేయడం
const nav = document.getElementById('forms-list');
if (nav) {
    for (const code in window.FORM_REGISTRY) {
        const f = window.FORM_REGISTRY[code];
        nav.innerHTML += `<button onclick="loadForm('${code}')" class="nav-btn">📄 ${f.name}</button>`;
    }
}

// 2. ఐఫ్రేమ్ ద్వారా ఫారమ్‌ను లోడ్ చేసే మెయిన్ ఇంజన్
window.loadForm = function(code) {
    const form = window.FORM_REGISTRY[code];
    if (!form) return;

    const stage = document.getElementById('form-stage');
    if (stage) {
        stage.src = form.file;

        // ఫారమ్ పూర్తిగా లోడ్ అయిన తర్వాత ఫీచర్స్ ని యాక్టివేట్ చేయడం
        stage.onload = function() {
            initSaaSFeatures(stage.contentWindow.document);
        };
    }
};

// 3. 🚀 అల్టిమేట్ SaaS ఫీచర్స్ కంట్రోలర్ (ఐఫ్రేమ్ లోపల ఇంజెక్ట్ అవుతుంది)
function initSaaSFeatures(fDoc) {
    const docBody = fDoc.querySelector('.dbody');
    const stampZone = fDoc.querySelector('.stamp, .stamp-zone');
    const a4Page = fDoc.querySelector('.a4');

    if (!docBody) return;

    // ── A. లోగో అప్‌లోడ్ & డ్రాగ్ అండ్ డ్రాప్ కంటైనర్ క్రియేషన్ ──
    if (!fDoc.getElementById('saas-logo-box')) {
        const logoBox = fDoc.createElement('div');
        logoBox.id = 'saas-logo-box';
        logoBox.innerHTML = `
            <div id="logo-drop-zone" style="border:2px dashed #cbd5e1; padding:10px; text-align:center; background:#f8fafc; border-radius:6px; cursor:pointer; font-family:sans-serif; font-size:11px; color:#64748b; margin-bottom:15px; position:relative; user-select:none;">
                 drag & drop / Click to Upload Logo
                <input type="file" id="logo-file" accept="image/*" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
            </div>
            <div id="logo-preview-wrap" style="display:none; text-align:center; margin-bottom:15px; position:relative; cursor:move;">
                <img id="uploaded-logo" src="" style="width:80px; height:auto; display:inline-block;">
                <div style="margin-top:5px;" class="no-print">
                    <button id="btn-logo-dec" style="padding:2px 6px; font-size:10px; cursor:pointer;">➖ Size</button>
                    <button id="btn-logo-inc" style="padding:2px 6px; font-size:10px; cursor:pointer;">➕ Size</button>
                    <button id="btn-logo-del" style="padding:2px 6px; font-size:10px; color:red; cursor:pointer; margin-left:10px;">🗑️</button>
                </div>
            </div>
        `;
        docBody.insertBefore(logoBox, docBody.firstChild);

        // లోగో ఈవెంట్ లిజనర్స్
        const fileInput = fDoc.getElementById('logo-file');
        const dropZone = fDoc.getElementById('logo-drop-zone');
        const logoImg = fDoc.getElementById('uploaded-logo');
        const previewWrap = fDoc.getElementById('logo-preview-wrap');

        function handleLogo(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                logoImg.src = e.target.result;
                dropZone.style.display = 'none';
                previewWrap.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        fileInput.addEventListener('change', (e) => handleLogo(e.target.files[0]));
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#e2e8f0'; });
        dropZone.addEventListener('dragleave', () => dropZone.style.background = '#f8fafc');
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); handleLogo(e.dataTransfer.files[0]); });

        // లోగో సైజ్ పెంచడం / తగ్గించడం
        fDoc.getElementById('btn-logo-inc').onclick = () => { logoImg.style.width = (parseInt(logoImg.style.width || 80) + 10) + 'px'; };
        fDoc.getElementById('btn-logo-dec').onclick = () => { logoImg.style.width = (parseInt(logoImg.style.width || 80) - 10) + 'px'; };
        fDoc.getElementById('btn-logo-del').onclick = () => { previewWrap.style.display = 'none'; dropZone.style.display = 'block'; logoImg.src = ''; };
    }

    // ── B. లాంగ్వేజ్ చేంజ్, పేపర్ టోగుల్ బార్ క్రియేషన్ (Top Toolbar) ──
    if (!fDoc.getElementById('saas-top-controls')) {
        const ctrlBar = fDoc.createElement('div');
        ctrlBar.id = 'saas-top-controls';
        ctrlBar.className = 'no-print';
        ctrlBar.style = "background:#e2e8f0; padding:8px; display:flex; gap:10px; align-items:center; border-radius:6px; margin-bottom:15px; font-family:sans-serif; font-size:12px;";
        ctrlBar.innerHTML = `
            <strong>⚙️ SaaS Tools:</strong>
            <button id="btn-lang-toggle" style="padding:4px 8px; font-weight:bold; cursor:pointer; background:#1a56a0; color:#fff; border:none; border-radius:4px;">🌐 Change Language (తెలుగు)</button>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin-left:auto; font-weight:600;">
                <input type="checkbox" id="toggle-paper-size"> 📜 Bond Paper Mode (No Stamp Space)
            </label>
        `;
        docBody.insertBefore(ctrlBar, docBody.firstChild);

        // ప్రింటింగ్ అప్పుడు ఈ టూల్‌బార్ మరియు లోగో బటన్లు కనిపించకుండా CSS ఇంజెక్షన్
        const style = fDoc.createElement('style');
        style.textContent = `@media print { .no-print { display: none !important; } }`;
        fDoc.head.appendChild(style);

        // 📜 Bond Size Paper vs Normal Stamp Paper Toggle లాజిక్
        fDoc.getElementById('toggle-paper-size').addEventListener('change', function(e) {
            if (e.target.checked) {
                // బాండ్ పేపర్ మోడ్: స్టాంప్ స్పేస్ మాయం అవుతుంది, మేటర్ పైకి వస్తుంది
                if (stampZone) stampZone.style.setProperty('display', 'none', 'important');
                docBody.style.paddingTop = '15mm'; 
                // ప్రింట్ అప్పుడు కూడా స్టాంప్ స్పేస్ లేకుండా డైరెక్ట్ గా టాప్ మార్జిన్ సెట్ అవుతుంది
                const printStyle = fDoc.createElement('style');
                printStyle.id = 'bond-print-css';
                printStyle.textContent = `@media print { .dbody { padding-top: 15mm !important; } }`;
                fDoc.head.appendChild(printStyle);
            } else {
                // నార్మల్ మోడ్: 5.2" స్టాంప్ స్పేస్ మళ్ళీ వస్తుంది
                if (stampZone) stampZone.style.display = '';
                docBody.style.paddingTop = '';
                const bondStyle = fDoc.getElementById('bond-print-css');
                if (bondStyle) bondStyle.remove();
            }
        });

        // 🌐 వన్-క్లిక్ లాంగ్వేజ్ చేంజ్ లాజిక్ (English ⇄ Telugu)
        let isTelugu = false;
        fDoc.getElementById('btn-lang-toggle').onclick = function() {
            isTelugu = !isTelugu;
            this.textContent = isTelugu ? "🌐 Change Language (English)" : "🌐 Change Language (తెలుగు)";
            
            // డాక్యుమెంట్ బాడీ లోపల ఉన్న టెక్స్ట్‌లను మార్చడం
            const docTitle = fDoc.querySelector('.doc-title, .dtitle');
            if (docTitle) {
                docTitle.textContent = isTelugu ? "అఫిడవిట్" : "AFFIDAVIT";
            }

            // క్లాజుల టెక్స్ట్ అనువాదం (డైనమిక్ గా మారడానికి ఒక బేసిక్ మ్యాపింగ్)
            fDoc.querySelectorAll('.clause span:not(.cl-n):not(.cl-num)').forEach((span, index) => {
                if (isTelugu) {
                    if (!span.dataset.eng) span.dataset.eng = span.innerHTML;
                    // ఇక్కడ మీ రిక్వైర్మెంట్ ప్రకారం తెలుగు టెక్స్ట్ మార్చుకోవచ్చు
                    span.innerHTML = span.innerHTML
                        .replace("That I am the deponent herein", "నేను ఈ అఫిడవిట్ దాఖలు చేస్తున్న డిపోనెంట్ అని")
                        .replace("The above contents are true and correct", "పైన పేర్కొన్న విషయాలన్నీ నిజం మరియు సరైనవి");
                } else {
                    if (span.dataset.eng) span.innerHTML = span.dataset.eng;
                }
            });
        };
    }
}
