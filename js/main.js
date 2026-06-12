// 1. ఎడమవైపు లిస్ట్‌లో బటన్లను జనరేట్ చేయడం
const nav = document.getElementById('forms-list');
if (nav) {
    for (const code in window.FORM_REGISTRY) {
        const f = window.FORM_REGISTRY[code];
        nav.innerHTML += `<button onclick="loadForm('${code}')" class="nav-btn">📄 ${f.name}</button>`;
    }
}

// 2. ఐఫ్రేమ్ ద్వారా ఫారమ్‌ను పర్ఫెక్ట్‌గా లోడ్ చేసే ఇంజన్
window.loadForm = function(code) {
    const form = window.FORM_REGISTRY[code];
    if (!form) return;

    const stage = document.getElementById('form-stage');
    if (stage) {
        // నేరుగా ఒరిజినల్ ఫైల్ పాత్‌ను ఐఫ్రేమ్ సోర్స్‌గా సెట్ చేయడం వల్ల Live Reload బ్రహ్మాండంగా పనిచేస్తుంది
        stage.src = form.file;
    }
};