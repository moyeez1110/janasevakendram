// 1. ఎడమవైపు ఫారమ్ ల లిస్ట్ జనరేట్ చేయడం
const nav = document.getElementById('forms-list');
if (nav) {
    nav.innerHTML = "<h3>Forms List</h3>"; // హెడర్ క్లియర్ గా ఉండటానికి
    for (const code in window.FORM_REGISTRY) {
        const f = window.FORM_REGISTRY[code];
        nav.innerHTML += `<button onclick="loadForm('${code}')" class="nav-btn" style="display:block; width:100%; margin-bottom:6px; padding:10px; text-align:left; cursor:pointer;">${f.name}</button>`;
    }
}

// 2. యూనివర్సల్ కోర్ లోడర్ & లైవ్ సింక్ ఇంజన్
window.loadForm = function(code) {
    const form = window.FORM_REGISTRY[code];
    if (!form) return;

    fetch(form.file)
        .then(response => response.text())
        .then(data => {
            const container = document.getElementById('form-container');
            if (!container) return;
            
            container.innerHTML = data;

            // HTML లోపల ఉన్న <script> ట్యాగ్స్‌ను ఎగ్జిక్యూట్ చేయడం
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            const scripts = doc.querySelectorAll('script');
            
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            });

            // లోడ్ అవ్వగానే ప్రతి ఫారమ్ యొక్క ఫీల్డ్స్ ని ఆటో-లింక్ చేయడం
            setTimeout(() => {
                // వేరియబుల్స్ గందరగోళం లేకుండా సెట్ చేయడం (MAP లేదా FIELDS ఏది ఉన్నా ఒకేలా మార్చడం)
                if (typeof MAP !== 'undefined') { window.FIELDS = MAP; }
                if (typeof FIELDS !== 'undefined') { window.MAP = FIELDS; }
                
                // సూపర్ పవర్ ఫుల్ గ్లోబల్ లైవ్ సింక్ ఫంక్షన్ (ఇది అన్ని ఫారమ్ లకూ పని చేస్తుంది)
                window.live = function() {
                    const currentFields = (typeof FIELDS !== 'undefined') ? FIELDS : ((typeof MAP !== 'undefined') ? MAP : null);
                    
                    if (currentFields) {
                        currentFields.forEach(m => {
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
                    
                    // అడ్రస్ ఆటో-బిల్డర్ కనెక్షన్ (Caste, Death, Residence అన్నింటికీ)
                    if (typeof buildAddress === 'function') {
                        buildAddress();
                    } else if (typeof buildAddr === 'function') {
                        buildAddr();
                    }
                    
                    // EWS మరియు ఇరత ఫారమ్ ల ప్రత్యేక కండిషన్స్ (Son/Daughter)
                    if (typeof extras === 'function') {
                        extras();
                    }
                };

                // ఇన్‌పుట్ బాక్సులన్నింటికీ లైవ్ ఈవెంట్ లిజనర్స్ యాడ్ చేయడం
                const inputs = container.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    input.addEventListener('input', window.live);
                    input.addEventListener('change', window.live);
                });

                // ఫారమ్ ఓపెన్ అవ్వగానే డీఫాల్ట్ బ్లాంక్స్ కనిపించడానికి
                if (typeof window.live === 'function') window.live();
                if (typeof scaleA4 === 'function') scaleA4();
            }, 200);
        })
        .catch(err => console.error("Error loading form:", err));
};

// గ్లోబల్ వాల్యూ రీడర్ హెల్పర్
window.v = function(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
};