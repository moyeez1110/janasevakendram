function loadForm(code) {
    const form = window.FORM_REGISTRY[code];
    fetch(form.file)
        .then(response => response.text())
        .then(data => {
            document.getElementById('form-container').innerHTML = data;
        });
}

// లిస్ట్‌ని ఆటోమేటిక్‌గా లోడ్ చేయడానికి
const nav = document.getElementById('forms-list');
for (const code in window.FORM_REGISTRY) {
    const f = window.FORM_REGISTRY[code];
    nav.innerHTML += `<button onclick="loadForm('${code}')">${f.name}</button>`;
}