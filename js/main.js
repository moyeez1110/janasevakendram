// 1. ఎడమవైపు లిస్ట్‌లో బటన్లను జనరేట్ చేయడం
const nav = document.getElementById('forms-list');
for (const code in window.FORM_REGISTRY) {
    const f = window.FORM_REGISTRY[code];
    nav.innerHTML += `<button onclick="loadForm('${code}')" style="display:block; width:100%; margin-bottom:5px;">${f.name}</button>`;
}

// 2. ఫారమ్‌లను డైనమిక్‌గా లోడ్ చేసే మెయిన్ ఇంజన్
window.loadForm = function(code) {
    const form = window.FORM_REGISTRY[code];
    if (!form) return;

    fetch(form.file)
        .then(response => response.text())
        .then(data => {
            const container = document.getElementById('form-container');
            container.innerHTML = data;

            // HTML లోపల ఉన్న <script> ట్యాగ్స్‌ను వెలికితీసి గ్లోబల్‌గా రన్ చేయడం
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            const scripts = doc.querySelectorAll('script');
            
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            });

            // ఫారమ్ లోడ్ అవ్వగానే ఆయా ఫైల్‌కు సంబంధించిన మ్యాపింగ్, అడ్రస్ మరియు స్కేలింగ్ యాక్టివేట్ చేయడం
            setTimeout(() => {
                // పాత ఫారమ్ మ్యాపింగ్ డేటా ఉంటే దాన్ని క్లియర్ చేసి కొత్త ఫారమ్ డేటా సెట్ చేయడం
                if (typeof MAP !== 'undefined') {
                    window.FIELDS = MAP; 
                }
                
                // గ్లోబల్ లైవ్ అప్‌డేట్ ఫంక్షన్
                window.live = function() {
                    // నార్మల్ ఫీల్డ్స్ మ్యాపింగ్
                    if (typeof FIELDS !== 'undefined') {
                        FIELDS.forEach(m => {
                            const el = document.getElementById(m.i);
                            if (!el) return;
                            let val = el.tagName === 'SELECT' ? el.options[el.selectedIndex].value : el.value.trim();
                            if (m.up && val) val = val.toUpperCase();
                            const targets = Array.isArray(m.o) ? m.o : [m.o];
                            targets.forEach(id => {
                                const t = document.getElementById(id);
                                if (t) t.textContent = val || m.def;
                            });
                        });
                    }

                    // డైనమిక్ అడ్రస్ బిల్డింగ్ లాజిక్
                    if (typeof buildAddress === 'function') {
                        buildAddress();
                    } else if (typeof buildAddr === 'function') {
                        // ఒకవేళ ఫైల్‌లో పాత పేరు ఉంటే
                        const addrText = buildAddr();
                        const addrEl = document.getElementById('o-address');
                        if (addrEl) addrEl.textContent = addrText;
                    }

                    // ఎక్స్‌ట్రా కండిషన్స్ (EWS లో Son/Daughter లాంటివి)
                    if (typeof extras === 'function') {
                        extras();
                    }
                };

                // ఫారమ్ ఓపెన్ అవ్వగానే రన్ చేయాల్సినవి
                if (typeof window.live === 'function') window.live();
                if (typeof scaleA4 === 'function') scaleA4();
            }, 150);
        })
        .catch(err => console.error("Error loading form:", err));
};

// హెల్పర్ ఫంక్షన్: ఇన్‌పుట్ బాక్స్ వాల్యూస్ ఈజీగా రీడ్ చేయడానికి
window.v = function(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
};