// ============= CONFIG =============
        const APIBASE = 'https://worker-d1.thecheesewagon.workers.dev';
        const GITHUB_USER = "TheCheeseWagon";
        const GITHUB_REPO = "WebSite";
        const IMAGES_FOLDER = "images";
        const GITHUB_REPOPATH = `${GITHUB_USER}/${GITHUB_REPO}`;

// === SESSION / CSRF HELPERS (added) ===
function getCookie(name) {
  return (document.cookie || '').split(';').map(s=>s.trim())
    .map(s=>s.split('='))
    .reduce((acc,[k,...v]) => (acc[k]=decodeURIComponent(v.join('=')), acc), {})[name];
}

async function bootstrapSessionOnce(username, password) {
  // One-time bootstrap: send header tokens on a GET (no CSRF required), receive cookies
  const resp = await apiFetch("/menu", {
    method: "GET",
    credentials: "include",
    headers: { "x-admin-token": password, "x-username-token": username }
  });
  // After this, Worker should have set cookies; read csrf
  window.__CSRF__ = getCookie("csrf");
  return resp.ok && !!window.__CSRF__;
}

async function apiFetch(path, opts = {}) {
  const o = Object.assign({ method: "GET", credentials: "include", headers: {} }, opts || {});
  o.method = (o.method || "GET").toUpperCase();
  o.headers = o.headers || {};
  if (["POST","PUT","PATCH","DELETE"].includes(o.method)) {
    o.headers["x-csrf-token"] = window.__CSRF__ || getCookie("csrf");
  }
  return fetch(APIBASE + path, o);
}

        // ========== GLOBAL STATE ==========
        let usernameToken = null;
let adminToken = null;
// Simple login handler: stores tokens and hides modal.
// Expects admin-username-input and admin-token-input inputs in the DOM.
function submitToken() {
    const userInput = document.getElementById('admin-username-input');
    const tokenInput = document.getElementById('admin-token-input');
    const errDiv = document.getElementById('login-error');
    if (!userInput || !tokenInput) {
        alert('Login inputs not found.');
        return;
    }
    const user = userInput.value.trim();
    const token = tokenInput.value.trim();
    if (!user || !token) {
        if (errDiv) errDiv.textContent = 'Please enter username and password/token.';
        return;
    }
    usernameToken = user;
    adminToken = token;
    try {
        localStorage.setItem('usernameToken', usernameToken);
        localStorage.setItem('adminToken', adminToken);
    } catch(e) {
        console.warn('Could not persist tokens to localStorage:', e);
    }
    // hide modal
    const modal = document.getElementById('token-prompt-modal');
    if (modal) modal.style.display = 'none';
    // refresh preview if available
    if (typeof loadPreviewFromProxy === 'function') {
        try { loadPreviewFromProxy(); } catch(e) { console.warn(e); }
    }
    if (typeof initializeEditor === 'function') {
        try { initializeEditor(); } catch(e) {}
    }
    if (typeof ensureCommitButton === 'function') {
        try { ensureCommitButton(); } catch(e) {}
    }
}
try { window.submitToken = window.submitToken || submitToken; } catch(e) {}

        let frameDocument = null;
        let frameWindow = null;
        let selectedElement = null;
        let originalStyles = new Map();
        let isFrameReady = false;
        let pendingChanges = {};
        let currentEditingElement = null;
        let cssContent = '';
        let menuData = {};
        let editedMenuItems = new Set();
        let allImages = [];
        let currentReplaceTarget = null;

        // Color picker state
        let originalCssContent = '';
        let colorChanges = {};
        let rootColorVariables = {};

        // ========== PAGE SWITCHING ==========
        function switchToEditor() {
            document.getElementById('cms-page').classList.remove('active');
            document.getElementById('css-editor-page').classList.add('active');
            setTimeout(() => {
                initializeEditor();
            }, 100);
        }

        function backToCMS() {
            document.getElementById('css-editor-page').classList.remove('active');
            document.getElementById('cms-page').classList.add('active');
        }

        function scrollToSection(sectionId) {
            document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
        }

        // ========== IMAGE SECTION TOGGLES ==========
        function toggleImageSection(section) {
            const content = document.getElementById(`imglist-${section}-content`);
            const title = content.previousElementSibling;
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                title.innerHTML = `▼ ${title.textContent.replace('▶', '').replace('(click to expand)', '').trim()}`;
            } else {
                content.classList.add('collapsed');
                const baseTitleText = title.textContent.replace('▼', '').replace('▶', '').trim();
                title.innerHTML = `▶ ${baseTitleText} <span style="font-size: 0.8em; color: #999;">(click to expand)</span>`;
            }
        }

        // ========== LOGIN LOGIC ==========
        function getTimestampedFilename(filename) {
            const ext = filename.split('.').pop();
            const base = filename.replace(/\.[^/.]+$/, "");
            const now = new Date();
            let mm = String(now.getMonth() + 1).padStart(2, '0');
            let dd = String(now.getDate()).padStart(2, '0');
            let yyyy = now.getFullYear();
            let h = now.getHours(), mer = 'AM';
            if (h >= 12) mer = 'PM';
            h = h % 12;
            if (h === 0) h = 12;
            let hh = String(h).padStart(2, '0');
            let min = String(now.getMinutes()).padStart(2, '0');
            const stamp = `${mm}-${dd}-${yyyy}_${hh}-${min}${mer}`;
            return `${base}_${stamp}.${ext}`;
        }

        function showTokenPrompt(error = "") {
            document.getElementById("token-prompt-modal").style.display = "flex";
            document.getElementById("admin-username-input").value = usernameToken || "";
            document.getElementById("admin-token-input").value = "";
            let errorMsg = document.getElementById("login-error");
            errorMsg.textContent = error ? error : "";
            setTimeout(() => document.getElementById("admin-username-input").focus(), 10);
        }

        function hideTokenPrompt() {
            document.getElementById("token-prompt-modal").style.display = "none";
        }

        async function validateTokens(uToken, aToken) {
  try {
    const ok = await bootstrapSessionOnce(uToken, aToken);
    return !!ok;
  } catch (e) {
    console.error("validateTokens error", e);
    return false;
  }
}






        async function submitToken() {
  const uToken = (document.getElementById("admin-username-input")?.value || "").trim();
  const aToken = (document.getElementById("admin-token-input")?.value || "").trim();
  if (!uToken || !aToken) {
    const node = document.getElementById("login-error"); if (node) node.textContent = "Both fields required";
    return;
  }
  const ok = await validateTokens(uToken, aToken);
  if (!ok) {
    const node = document.getElementById("login-error"); if (node) node.textContent = "Invalid username/password";
    return;
  }
  // Clear any leftover tokens
  usernameToken = null; adminToken = null;
  try { localStorage.removeItem("usernameToken"); localStorage.removeItem("adminToken"); } catch(e){}
  if (!window.__CSRF__) window.__CSRF__ = getCookie("csrf");
  hideTokenPrompt();
  await populateCmsDropdown().catch(()=>{});
  await fetchAndCategorizeImages().catch(()=>{});
  fetchMenu();
}
        function logout() {
  usernameToken = null; adminToken = null;
  try { localStorage.removeItem("usernameToken"); localStorage.removeItem("adminToken"); } catch(_){}
  // Clear CSRF cookie (session will expire server-side)
  document.cookie = "csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  showTokenPrompt();
}

        window.addEventListener("DOMContentLoaded", async () => {
  // If CSRF cookie exists, assume session is alive; otherwise require login
  const csrf = getCookie("csrf");
  if (csrf) {
    window.__CSRF__ = csrf;
    hideTokenPrompt();
    await populateCmsDropdown().catch(()=>{});
    await fetchAndCategorizeImages().catch(()=>{});
    fetchMenu();
  } else {
    showTokenPrompt();
  }
});function setStatus(msg, type = "success") {
            document.getElementById("status").innerHTML = `<div class="${type}">${msg}</div>`;
            setTimeout(() => { document.getElementById("status").innerHTML = ""; }, 2800);
        }

        // ===== CMS FILE EDITOR LOGIC =====
        let lastFileSha = null;

        async function populateCmsDropdown() {
            const select = document.getElementById("cms-filename-select");
            select.innerHTML = '<option>Loading...</option>';
            const url = `https://api.github.com/repos/${GITHUB_REPOPATH}/contents/`;
            try {
                const resp = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
                if (!resp.ok) throw new Error("Bad response");
                const files = await resp.json();
                select.innerHTML = '';
                for (const file of files) {
                    if (file.type === 'file' && !file.name.startsWith('.')) {
                        select.innerHTML += `<option value="${file.name}">${file.name}</option>`;
                    }
                }
                if (!select.innerHTML) select.innerHTML = '<option>No files found</option>';
            } catch {
                select.innerHTML = '<option>Error loading files</option>';
            }
        }

        async function loadFile() {
            const filename = document.getElementById("cms-filename-select").value;
            if (!filename) return;
            document.getElementById("cms-content").value = "Loading...";
            document.getElementById("cms-status").textContent = "";
            lastFileSha = null;
            const url = `https://api.github.com/repos/${GITHUB_REPOPATH}/contents/${filename}?ref=main`;
            try {
                const resp = await fetch(url, { headers: { Accept: "application/vnd.github.v3.raw" } });
                if (resp.status === 200) {
                    const content = await resp.text();
                    document.getElementById("cms-content").value = content;
                    if (filename === 'style.css') {
                        cssContent = content;
                    }
                    const metaResp = await fetch(url.replace("?ref=main", ""), { headers: { Accept: "application/vnd.github+json" } });
                    if (metaResp.ok) {
                        const meta = await metaResp.json();
                        lastFileSha = meta.sha;
                    }
                    document.getElementById("cms-status").textContent = "Loaded ✔";
                } else {
                    document.getElementById("cms-content").value = "";
                    document.getElementById("cms-status").textContent = "Not found";
                }
            } catch {
                document.getElementById("cms-content").value = "";
                document.getElementById("cms-status").textContent = "Not found";
            }
        }

        async function saveFile() {
            const filename = document.getElementById("cms-filename-select").value;
            const content = document.getElementById("cms-content").value;
            if (!filename) return;
            document.getElementById("cms-save-status").textContent = "Publishing...";
            const resp = await apiFetch("/github/edit-file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"},
                body: JSON.stringify({
                    repo: GITHUB_REPOPATH,
                    path: filename,
                    content: content,
                    message: `Edit ${filename} via dashboard`,
                    branch: "main",
                    sha: lastFileSha
                })
            });
            if (resp.ok) {
                document.getElementById("cms-save-status").textContent = "Published ✔";
                if (filename === 'style.css') {
                    cssContent = content;
                }
                loadFile();
            } else {
                try {
                    const err = await resp.json();
                    document.getElementById("cms-save-status").textContent = err.message || "Error publishing";
                } catch {
                    document.getElementById("cms-save-status").textContent = "Error publishing";
                }
            }
        }

// COLOR PICKER FUNCTIONALITY
function openColorPicker() {
    document.getElementById('colorPickerModal').style.display = 'flex';
    loadCssColors();
}

function closeColorPicker() {
    document.getElementById('colorPickerModal').style.display = 'none';
}

async function loadCssColors() {
    document.getElementById('colorPickerStatus').textContent = 'Loading CSS colors...';

    try {
        // Fetch style.css through proxy with proper auth headers
        const cssResponse = await fetch(`${APIBASE}/proxy/style.css`, {
            headers: {
                'x-admin-token': adminToken,
                'x-username-token': usernameToken
            }
        });

        if (!cssResponse.ok) {
            throw new Error(`Failed to load CSS file: ${cssResponse.status} ${cssResponse.statusText}`);
        }

        originalCssContent = await cssResponse.text();

        // Parse :root variables
        parseRootVariables(originalCssContent);
        displayColorVariables();

        const varCount = Object.keys(rootColorVariables).length;
        document.getElementById('colorPickerStatus').textContent = 
            varCount > 0 ? `Found ${varCount} color variables` : 'No color variables found in :root';

    } catch (error) {
        console.error('Error loading CSS colors:', error);
        document.getElementById('colorPickerStatus').textContent = 'Error loading CSS file. Make sure the proxy endpoint is working.';
    }
}



function parseRootVariables(cssText) {
    // Build maps of firstSeen (original) and lastSeen (current effective)
    const firstSeen = {};
    const lastSeen = {};

    // Find all :root blocks
    const rootRegex = /:root\s*\{([\s\S]*?)\}/g;
    let m;
    const allBlocks = [];
    while ((m = rootRegex.exec(cssText)) !== null) {
        allBlocks.push(m[1]);
    }

    if (allBlocks.length === 0) {
        rootColorVariables = {};
        return;
    }

    // Parse variables in each block; first occurrence wins for original, last overrides for current
    for (let bi = 0; bi < allBlocks.length; bi++) {
        const block = allBlocks[bi];
        const varRegex = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+)\s*;/g;
        let vm;
        while ((vm = varRegex.exec(block)) !== null) {
            const key = `--${vm[1].trim()}`;
            const val = vm[2].trim();
            if (!(key in firstSeen)) {
                firstSeen[key] = val;
            }
            // always assign lastSeen to latest occurrence
            lastSeen[key] = val;
        }
    }

    // Build rootColorVariables from union of keys
    rootColorVariables = {};
    const keys = Array.from(new Set(Object.keys(firstSeen).concat(Object.keys(lastSeen))));
    for (const name of keys) {
        rootColorVariables[name] = {
            originalValue: (firstSeen[name] !== undefined ? firstSeen[name] : (lastSeen[name] !== undefined ? lastSeen[name] : '')),
            currentValue: (lastSeen[name] !== undefined ? lastSeen[name] : (firstSeen[name] !== undefined ? firstSeen[name] : ''))
        };
    }
}


function isColorValue(value) {
    // Check for hex colors
    if (/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value)) return true;

    // Check for rgb/rgba
    if (/^rgba?\s*\([^)]*\)$/i.test(value)) return true;

    // Check for hsl/hsla
    if (/^hsla?\s*\([^)]*\)$/i.test(value)) return true;

    // Check for common color names
    const colorNames = ['red', 'green', 'blue', 'black', 'white', 'gray', 'grey', 'yellow', 'orange', 'purple', 'pink', 'brown', 'cyan', 'magenta'];
    if (colorNames.includes(value.toLowerCase())) return true;

    return false;
}

function displayColorVariables() {
    const container = document.getElementById('colorVariablesList');
    container.innerHTML = '';

    if (Object.keys(rootColorVariables).length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">No color variables found in :root CSS block. Make sure your style.css contains :root { --variable-name: color-value; }</p>';
        return;
    }

    Object.entries(rootColorVariables).forEach(([name, data]) => {
        const item = document.createElement('div');
        item.className = 'color-variable-item';
        item.dataset.variableName = name;

        const isModified = colorChanges[name] && colorChanges[name] !== data.originalValue;
        if (isModified) {
            item.classList.add('modified');
        }

        const currentValue = colorChanges[name] || data.currentValue;
        const normalizedColor = normalizeColorValue(currentValue);

        item.innerHTML = `
            <div class="color-variable-header">
                <span class="color-variable-name">${name}</span>
                <div class="color-preview" style="background-color: ${normalizedColor};" 
                     onclick="document.querySelector('[data-color-input=\"${name}\"]').click()"></div>
            </div>
            <div class="color-input-section">
                <input type="color" data-color-input="${name}" value="${normalizedColor}" 
                       onchange="updateColorValue('${name}', this.value)">
                <input type="text" data-text-input="${name}" value="${currentValue}" 
                       oninput="updateColorValueFromText('${name}', this.value)"
                       placeholder="e.g. #FF8C00, rgb(255,140,0)">
            </div>
            <div class="color-original-value">Original: ${data.originalValue}</div>
        `;

        container.appendChild(item);
    });
}

function normalizeColorValue(colorValue) {
    // Convert rgb() to hex for color input
    if (colorValue.startsWith('rgb(')) {
        const matches = colorValue.match(/rgb\(([^)]+)\)/);
        if (matches) {
            const [r, g, b] = matches[1].split(',').map(v => parseInt(v.trim()));
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
            }
        }
    }

    // Convert rgba() to hex (ignore alpha)
    if (colorValue.startsWith('rgba(')) {
        const matches = colorValue.match(/rgba\(([^)]+)\)/);
        if (matches) {
            const values = matches[1].split(',').map(v => parseFloat(v.trim()));
            if (values.length >= 3) {
                const [r, g, b] = values;
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1).toUpperCase()}`;
                }
            }
        }
    }

    // Return hex colors as-is (normalize to uppercase)
    if (colorValue.startsWith('#')) {
        return colorValue.toUpperCase();
    }

    // For other formats, return a default
    return '#FF8C00';
}

function updateColorValue(variableName, newValue) {
    colorChanges[variableName] = newValue;

    // Update text input
    const textInput = document.querySelector(`[data-text-input="${variableName}"]`);
    if (textInput) {
        textInput.value = newValue;
    }

    // Update preview
    const preview = document.querySelector(`[data-variable-name="${variableName}"] .color-preview`);
    if (preview) {
        preview.style.backgroundColor = newValue;
    }

    // Mark as modified
    const item = document.querySelector(`[data-variable-name="${variableName}"]`);
    if (item) {
        item.classList.add('modified');
    }

    // Apply live preview
    applyLiveColorPreview();
    updateColorPickerStatus();
}

function updateColorValueFromText(variableName, newValue) {
    if (!isColorValue(newValue) && newValue.trim() !== '') {
        return; // Invalid color value
    }

    colorChanges[variableName] = newValue;

    // Update color input if it's a valid color
    const colorInput = document.querySelector(`[data-color-input="${variableName}"]`);
    if (colorInput) {
        const normalized = normalizeColorValue(newValue);
        colorInput.value = normalized;
    }

    // Update preview
    const preview = document.querySelector(`[data-variable-name="${variableName}"] .color-preview`);
    if (preview) {
        try {
            preview.style.backgroundColor = newValue;
        } catch (e) {
            // Invalid color, keep previous
        }
    }

    // Mark as modified
    const item = document.querySelector(`[data-variable-name="${variableName}"]`);
    if (item && newValue !== rootColorVariables[variableName].originalValue) {
        item.classList.add('modified');
    } else if (item) {
        item.classList.remove('modified');
    }

    // Apply live preview
    applyLiveColorPreview();
    updateColorPickerStatus();
}

function applyLiveColorPreview() {
    if (!frameDocument) return;

    // Find or create a style element for live color preview
    let previewStyle = frameDocument.getElementById('color-preview-styles');
    if (!previewStyle) {
        previewStyle = frameDocument.createElement('style');
        previewStyle.id = 'color-preview-styles';
        if (frameDocument.head) {
            frameDocument.head.appendChild(previewStyle);
        }
    }

    // Build CSS with color changes
    let cssRules = ':root {\n';
    Object.entries(colorChanges).forEach(([variable, value]) => {
        cssRules += `  ${variable}: ${value};\n`;
    });
    cssRules += '}';

    previewStyle.textContent = cssRules;
}

function filterColorVariables(searchTerm) {
    const items = document.querySelectorAll('.color-variable-item');
    const lowerSearch = searchTerm.toLowerCase();

    items.forEach(item => {
        const variableName = item.dataset.variableName.toLowerCase();
        const shouldShow = variableName.includes(lowerSearch) || lowerSearch === '';
        item.style.display = shouldShow ? 'block' : 'none';
    });
}

function updateColorPickerStatus() {
    const changeCount = Object.keys(colorChanges).length;
    const statusEl = document.getElementById('colorPickerStatus');

    if (changeCount === 0) {
        statusEl.textContent = `Found ${Object.keys(rootColorVariables).length} color variables`;
    } else {
        statusEl.textContent = `${changeCount} color${changeCount !== 1 ? 's' : ''} modified`;
    }
}

function stageColorChanges() {
    if (Object.keys(colorChanges).length === 0) {
        alert('No color changes to stage.');
        return;
    }

    // Initialize staging containers
    if (!window.pendingStyleEdits) window.pendingStyleEdits = {};

    // Add color changes to staged edits
    if (!window.pendingStyleEdits[':root']) {
        window.pendingStyleEdits[':root'] = {};
    }

    Object.entries(colorChanges).forEach(([variable, value]) => {
        window.pendingStyleEdits[':root'][variable] = value;
    });

    // Update commit badge
    updateCommitBadge();

    // Show success message
    setStatus(`${Object.keys(colorChanges).length} color changes added to staged edits. Press Save All to publish.`, 'success');

    // Close color picker
    closeColorPicker();

    alert(`${Object.keys(colorChanges).length} color changes have been staged! Press "Save All" to publish them.`);
}

function resetColorChanges() {
    if (Object.keys(colorChanges).length === 0) {
        return;
    }

    if (!confirm('Reset all color changes?')) {
        return;
    }

    colorChanges = {};

    // Remove live preview styles
    if (frameDocument) {
        const previewStyle = frameDocument.getElementById('color-preview-styles');
        if (previewStyle) {
            previewStyle.remove();
        }
    }

    // Refresh display
    displayColorVariables();
    updateColorPickerStatus();

    setStatus('Color changes reset', 'success');
}

        // ========== IMAGE MANAGEMENT ==========
        async function fetchRootHtmlCssJsFiles() {
            const url = `https://api.github.com/repos/${GITHUB_REPOPATH}/contents/`;
            const resp = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
            if (!resp.ok) return [];
            const files = await resp.json();
            return files.filter(f =>
                f.type === "file" &&
                (f.name.endsWith(".html") || f.name.endsWith(".css") || f.name.endsWith(".js"))
            ).map(f => f.name);
        }

        async function fetchTextFile(filename) {
            const url = `https://api.github.com/repos/${GITHUB_REPOPATH}/contents/${filename}?ref=main`;
            const resp = await fetch(url, { headers: { Accept: "application/vnd.github.v3.raw" } });
            if (resp.ok) return await resp.text();
            return "";
        }

        function findReferencedImages(allCode) {
            const regex = /images\/([a-zA-Z0-9._\-]+)/g;
            const found = new Set();
            for (let code of allCode) {
                let m;
                while ((m = regex.exec(code))) found.add(m[1]);
            }
            return found;
        }

        async function fetchAndCategorizeImages() {
            const inuseDiv = document.getElementById("imglist-inuse");
            const unusedDiv = document.getElementById("imglist-unused");
            inuseDiv.innerHTML = "<div>Loading images...</div>";
            unusedDiv.innerHTML = "";

            let imgs;
            try {
                const resp = await apiFetch("/github/list-images", {
                    method: "POST",
                    headers: {
                        },
                    cache: "no-store"
                });
                imgs = await resp.json();
                if (!resp.ok || !Array.isArray(imgs)) throw new Error("Error");
            } catch {
                inuseDiv.innerHTML = "<div class='error'>No images found / access denied.</div>";
                return;
            }

            // Store all images for the selector modal
            allImages = imgs;

            const files = await fetchRootHtmlCssJsFiles();
            let allCode = [];
            for (const f of files) {
                allCode.push(await fetchTextFile(f));
            }
            const referenced = findReferencedImages(allCode);

            let inUse = [], unused = [];
            for (const file of imgs) {
                if (referenced.has(file.name)) inUse.push(file);
                else unused.push(file);
            }

            inuseDiv.innerHTML = inUse.length ? "" : "<div class='imglist-empty'>None found.</div>";
            unusedDiv.innerHTML = unused.length ? "" : "<div class='imglist-empty'>None found.</div>";

            for (const file of inUse) {
                const card = document.createElement("div");
                card.className = "imgcard";
                card.innerHTML = `
                    <div class="fname">${file.name}</div>
                    <div style="height:152px;display:flex;align-items:center;justify-content:center">
                        <img loading="lazy" src="${file.display_url}" alt="${file.name}">
                    </div>
                    <div class="img-actions">
                        <button class="replace-btn" onclick="replaceImage('${file.name}','${file.sha}')">Replace</button>
                        <button class="replace-existing-btn" onclick="showReplaceWithExisting('${file.name}','${file.sha}')">Replace w/ Existing</button>
                        <button class="delete-btn" onclick="deleteImage('${file.name}','${file.sha}')">Delete</button>
                    </div>
                `;
                inuseDiv.appendChild(card);
                
                // Handle image load errors
                const imgel = card.querySelector("img");
                imgel.onerror = () => { 
                    imgel.style.display = "none"; 
                    card.querySelector(".fname").innerHTML += "<span style='color:red'>[Error loading]</span>"; 
                };
            }

            for (const file of unused) {
                const card = document.createElement("div");
                card.className = "imgcard";
                card.innerHTML = `
                    <div class="fname">${file.name}</div>
                    <div style="height:152px;display:flex;align-items:center;justify-content:center">
                        <img loading="lazy" src="${file.display_url}" alt="${file.name}">
                    </div>
                    <div class="img-actions">
                        <button class="replace-btn" onclick="replaceImage('${file.name}','${file.sha}')">Replace</button>
                        <button class="replace-existing-btn" onclick="showReplaceWithExisting('${file.name}','${file.sha}')">Replace w/ Existing</button>
                        <button class="delete-btn" onclick="deleteImage('${file.name}','${file.sha}')">Delete</button>
                    </div>
                `;
                unusedDiv.appendChild(card);
                
                // Handle image load errors  
                const imgel = card.querySelector("img");
                imgel.onerror = () => { 
                    imgel.style.display = "none"; 
                    card.querySelector(".fname").innerHTML += "<span style='color:red'>[Error loading]</span>"; 
                };
            }
        }

// ========== REPLACE WITH EXISTING IMAGE LOGIC ==========
function showReplaceWithExisting(targetImageName, targetImageSha) {
    currentReplaceTarget = { name: targetImageName, sha: targetImageSha };
    
    const modal = document.getElementById('imageSelectModal');
    const grid = document.getElementById('imageSelectGrid');
    
    // Clear previous content
    grid.innerHTML = '';
    
    // Populate with all images except the target
    allImages.forEach(img => {
        if (img.name !== targetImageName) {
            const item = document.createElement('div');
            item.className = 'image-select-item';
            item.onclick = () => replaceWithSelectedImage(img.name);
            
            item.innerHTML = `
                <img src="${img.display_url}" alt="${img.name}">
                <div class="image-name">${img.name}</div>
            `;
            
            grid.appendChild(item);
        }
    });
    
    modal.style.display = 'flex';
}

function closeImageSelector() {
    document.getElementById('imageSelectModal').style.display = 'none';
    currentReplaceTarget = null;
}

// Updates HTML/CSS references instead of overwriting image content
async function replaceWithSelectedImage(sourceImageName) {
    if (!currentReplaceTarget) return;
    
    const targetName = currentReplaceTarget.name;
    
    alert(`Updating references from ${targetName} to ${sourceImageName}...`);
    closeImageSelector();
    
    try {
        // Update code references in HTML/CSS/JS files
        const files = await fetchRootHtmlCssJsFiles();
        let updatedFiles = 0;
        
        for (let filename of files) {
            let text = await fetchTextFile(filename);
            if (!text) continue;
            
            let updated = updateCodeReferences(text, targetName, sourceImageName);
            if (updated !== text) {
                let fileSha = await fetchFileSha(filename);
                const resp = await apiFetch("/github/edit-file", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"},
                    body: JSON.stringify({
                        repo: GITHUB_REPOPATH,
                        path: filename,
                        content: updated,
                        message: `Update image references: ${targetName} → ${sourceImageName}`,
                        branch: "main",
                        sha: fileSha
                    })
                });
                
                if (resp.ok) {
                    updatedFiles++;
                }
            }
        }
        
        if (updatedFiles > 0) {
            alert(`Successfully updated ${updatedFiles} file(s) to use ${sourceImageName}!`);
        } else {
            alert(`No references to ${targetName} found in code files.`);
        }
        
        await fetchAndCategorizeImages();
        
    } catch (error) {
        console.error('Error updating image references:', error);
        alert(`Error updating image references: ${error.message}`);
    }
}

function updateCodeReferences(code, oldImg, newImg) {
    // Update HTML src attributes
    code = code.replace(
        new RegExp(`(<[^>]+src=["'])images/${oldImg}(["'][^>]*>)`, "g"),
        `$1images/${newImg}$2`
    );
    // Update CSS url() references
    code = code.replace(
        new RegExp(`url\\(["']images/${oldImg}["']\\)`, "g"),
        `url('images/${newImg}')`
    );
    // Update any other plain text image references
    code = code.replace(
        new RegExp(`images/${oldImg}`, "g"),
        `images/${newImg}`
    );
    return code;
}

async function fetchFileSha(filename) {
    const url = `https://api.github.com/repos/${GITHUB_REPOPATH}/contents/${filename}`;
    const resp = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!resp.ok) return null;
    const meta = await resp.json();
    return meta && meta.sha ? meta.sha : null;
}

async function replaceImage(fname, sha) {
    const inp = document.getElementById("image-upload");
    inp.value = "";
    inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setStatus(`Uploading & relinking ${file.name}...`);
        const newFileName = getTimestampedFilename(file.name);
        const fr = new FileReader();
        fr.onload = async () => {
            const b64 = fr.result.split(",")[1];
            const uploadResp = await apiFetch("/github/create-file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"},
                body: JSON.stringify({
                    repo: GITHUB_REPOPATH,
                    path: IMAGES_FOLDER + "/" + newFileName,
                    content: b64,
                    message: `Upload new image ${newFileName} (replace ${fname})`,
                    branch: "main"
                }),
                cache: "no-store"
            });
            if (!uploadResp.ok) {
                setStatus("Error uploading image", "error");
                return;
            }

            // Update code references to point to new image
            const files = await fetchRootHtmlCssJsFiles();
            for (let filename of files) {
                let text = await fetchTextFile(filename);
                if (!text) continue;
                let updated = updateCodeReferences(text, fname, newFileName);
                if (updated !== text) {
                    let fileSha = await fetchFileSha(filename);
                    await apiFetch("/github/edit-file", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"},
                        body: JSON.stringify({
                            repo: GITHUB_REPOPATH,
                            path: filename,
                            content: updated,
                            message: `Update ref to ${newFileName} replacing ${fname}`,
                            branch: "main",
                            sha: fileSha
                        }),
                        cache: "no-store"
                    });
                }
            }
            setStatus("Image replaced & linked!", "success");
            await fetchAndCategorizeImages();
        };
        fr.readAsDataURL(file);
    };
    inp.click();
}

function showImageUploader() {
    const inp = document.getElementById("image-upload");
    inp.value = "";
    inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setStatus(`Uploading ${file.name}...`);
        const fr = new FileReader();
        fr.onload = async () => {
            const b64 = fr.result.split(",")[1];
            const resp = await apiFetch("/github/create-file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"},
                body: JSON.stringify({
                    repo: GITHUB_REPOPATH,
                    path: IMAGES_FOLDER + "/" + file.name,
                    content: b64,
                    message: `Add image ${file.name}`,
                    branch: "main"
                }),
                cache: "no-store"
            });
            if (resp.ok) {
                setStatus("Image uploaded!");
                await fetchAndCategorizeImages();
            } else {
                try {
                    const err = await resp.json();
                    setStatus(err.message || "Error uploading", "error");
                } catch {
                    setStatus("Error uploading", "error");
                }
            }
        };
        fr.readAsDataURL(file);
    };
    inp.click();
}

async function deleteImage(fname, sha) {
    if (!confirm(`Delete ${fname}?`)) return;
    setStatus(`Deleting ${fname}...`);
    const resp = await apiFetch("/github/delete-file", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"},
        body: JSON.stringify({
            repo: GITHUB_REPOPATH,
            path: IMAGES_FOLDER + "/" + fname,
            message: `Delete image ${fname}`,
            branch: "main",
            sha: sha
        })
    });
    if (resp.ok) {
        setStatus("Image deleted!");
        await fetchAndCategorizeImages();
    } else {
        setStatus("Error deleting image", "error");
    }
}


        // ========== MENU MANAGEMENT ==========
        async function fetchMenu() {
            try {
                const resp = await fetch(APIBASE + "/menu");
                const menu = await resp.json();
                menuData = {};
                
                const tbody = document.getElementById("menu-table");
                tbody.innerHTML = "";
                
                for (const item of menu) {
                    menuData[item.id] = { ...item };
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${item.id}</td>
                        <td class="editable-cell" data-field="section" data-id="${item.id}" onclick="makeEditable(this)">${item.section}</td>
                        <td class="editable-cell" data-field="title" data-id="${item.id}" onclick="makeEditable(this)">${item.title}</td>
                        <td class="editable-cell" data-field="description" data-id="${item.id}" onclick="makeEditable(this, true)">${item.description}</td>
                        <td class="editable-cell" data-field="price" data-id="${item.id}" onclick="makeEditable(this)">${item.price}</td>
                        <td class="save-cell">
                            <button class="save-btn" id="save-btn-${item.id}" onclick="saveMenuItem(${item.id})">Save</button>
                        </td>
                        <td><button onclick="deleteMenuItem(${item.id})">Delete</button></td>
                    `;
                    tbody.appendChild(row);
                }
            } catch (error) {
                setStatus("Error loading menu", "error");
            }
        }

        function makeEditable(cell, isTextarea = false) {
            if (cell.querySelector('input') || cell.querySelector('textarea')) return;
            
            const id = cell.dataset.id;
            const field = cell.dataset.field;
            const currentValue = cell.textContent;
            
            let inputElement;
            if (isTextarea) {
                inputElement = document.createElement('textarea');
                inputElement.style.minHeight = '60px';
            } else {
                inputElement = document.createElement('input');
                inputElement.type = 'text';
            }
            
            inputElement.value = currentValue;
            inputElement.style.width = '100%';
            inputElement.style.border = '1px solid #FF8C00';
            inputElement.style.padding = '4px';
            inputElement.style.fontFamily = 'inherit';
            inputElement.style.fontSize = 'inherit';
            
            inputElement.addEventListener('blur', () => {
                const newValue = inputElement.value;
                cell.textContent = newValue;
                
                // Update local data
                if (menuData[id]) {
                    menuData[id][field] = newValue;
                    editedMenuItems.add(parseInt(id));
                }
            });
            
            inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !isTextarea) {
                    inputElement.blur();
                } else if (e.key === 'Escape') {
                    cell.textContent = currentValue;
                }
            });
            
            cell.innerHTML = '';
            cell.appendChild(inputElement);
            inputElement.focus();
            inputElement.select();
        }

        async function saveMenuItem(id) {
            if (!menuData[id] || !editedMenuItems.has(id)) {
                setStatus("No changes to save", "error");
                return;
            }
            
            const data = {
                section: menuData[id].section,
                title: menuData[id].title,
                description: menuData[id].description,
                price: menuData[id].price
            };

            try {
                const resp = await fetch(APIBASE + "/menu/" + id, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"},
                    body: JSON.stringify(data)
                });

                if (resp.ok) {
                    setStatus("Menu item saved!");
                    editedMenuItems.delete(id);
                } else {
                    setStatus("Error saving menu item", "error");
                }
            } catch (error) {
                setStatus("Error saving menu item", "error");
            }
        }

        // Add form handler
        document.getElementById("add-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            const resp = await apiFetch("/menu", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"},
                body: JSON.stringify(data)
            });
            
            if (resp.ok) {
                setStatus("Menu item added!");
                e.target.reset();
                fetchMenu();
            } else {
                setStatus("Error adding menu item", "error");
            }
        });

        async function deleteMenuItem(id) {
            if (!confirm("Delete this menu item?")) return;
            
            const resp = await fetch(APIBASE + "/menu/" + id, {
                method: "DELETE",
                headers: {
                    }
            });
            
            if (resp.ok) {
                setStatus("Menu item deleted!");
                fetchMenu();
            } else {
                setStatus("Error deleting menu item", "error");
            }
        }

        // ========== CSS EDITOR LOGIC (UPDATED FOR PROXY) ==========
        const SIMPLE_CONTROLS = {
            'Basic Adjustments': {
                'Size': { property: 'width', min: 50, max: 800, unit: 'px', default: 300 },
                'Height': { property: 'height', min: 30, max: 600, unit: 'px', default: 200 },
                'Rounded Corners': { property: 'border-radius', min: 0, max: 50, unit: 'px', default: 0 },
                'Shadow': { property: 'box-shadow', min: 0, max: 30, unit: 'px', default: 0 },
                'Transparency': { property: 'opacity', min: 10, max: 100, unit: '%', default: 100 }
            },
            'Spacing': {
                'Space Around': { property: 'margin', min: 0, max: 100, unit: 'px', default: 0 },
                'Inner Padding': { property: 'padding', min: 0, max: 50, unit: 'px', default: 0 }
            }
        };

        function initializeEditor() {
            const frame = document.getElementById('previewFrame');
            
            // UPDATED: Load HTML via proxy to avoid CORS
            loadPreviewFromProxy();
            
            frame.addEventListener('load', setupClickableElements);
            
            setTimeout(() => {
                if (!isFrameReady) {
                    setupClickableElements();
                }
            }, 2000);
        }

 // NEW: Enhanced loadPreviewFromProxy function with image support
async function loadPreviewFromProxy() {
    try {
        // Fetch HTML content through proxy
        const htmlResponse = await fetch(`${APIBASE}/proxy/index.html`, {
            headers: {
                }
        });
        
        if (!htmlResponse.ok) {
            throw new Error('Failed to load HTML via proxy');
        }
        
        let htmlContent = await htmlResponse.text();
        
        // Update HTML to use proxy endpoints for CSS and JS
        htmlContent = htmlContent.replace(
            /href="\.\/style\.css"/g,
            `href="${APIBASE}/proxy/style.css"`
        );
        htmlContent = htmlContent.replace(
            /src="\.\/script\.js"/g,
            `src="${APIBASE}/proxy/script.js"`
        );
        
        // Fix image paths in HTML to use GitHub raw URLs directly
        const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main`;
        htmlContent = htmlContent.replace(/src="images\//g, `src="${GITHUB_RAW_BASE}/images/`);
        htmlContent = htmlContent.replace(/src="\.\/images\//g, `src="${GITHUB_RAW_BASE}/images/`);
        
        // Also fetch and update CSS to fix background images
        const cssResponse = await fetch(`${APIBASE}/proxy/style.css`, {
            headers: {
                }
        });
        
        if (cssResponse.ok) {
            let cssContent = await cssResponse.text();
            
            // Fix CSS background image paths to use GitHub raw URLs
            cssContent = cssContent.replace(
                /url\(['"]?images\//g,
                `url('${GITHUB_RAW_BASE}/images/`
            );
            cssContent = cssContent.replace(
                /url\(['"]?\.\/images\//g,
                `url('${GITHUB_RAW_BASE}/images/`
            );
            
            // Handle various CSS url() formats
            cssContent = cssContent.replace(
                /url\(['"]?\.\.\/images\//g,
                `url('${GITHUB_RAW_BASE}/images/`
            );
            cssContent = cssContent.replace(
                /url\(images\//g,
                `url(${GITHUB_RAW_BASE}/images/`
            );
            
            // Create inline style block with updated CSS
            const styleBlock = `<style>${cssContent}</style>`;
            
            // Remove original CSS link and add inline styles
            htmlContent = htmlContent.replace(
                /<link[^>]*href="[^"]*style\.css"[^>]*>/g,
                styleBlock
            );
        }
        
        // Create blob URL for the modified HTML
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        
        const frame = document.getElementById('previewFrame');
        frame.src = blobUrl;
        
        // Clean up previous blob URL to prevent memory leaks
        if (frame.dataset.previousBlobUrl) {
            URL.revokeObjectURL(frame.dataset.previousBlobUrl);
        }
        frame.dataset.previousBlobUrl = blobUrl;
        
    } catch (error) {
        console.error('Error loading preview via proxy:', error);
        showError('Could not load website preview. Make sure your worker has proxy endpoints.');
    }
}


        function setupClickableElements() {
            const frame = document.getElementById('previewFrame');
            
            try {
                frameDocument = frame.contentDocument || frame.contentWindow?.document;
                frameWindow = frame.contentWindow;
                
                if (!frameDocument || !frameDocument.body) {
                    setTimeout(setupClickableElements, 500);
                    return;
                }
                
                injectStyles();
                
                const allElements = frameDocument.querySelectorAll('*');
                allElements.forEach((element, index) => {
                    const tagName = element.tagName.toLowerCase();
                    if (['html', 'head', 'body', 'script', 'style', 'meta', 'link', 'title'].includes(tagName)) {
                        return;
                    }
                    
                    element.setAttribute('data-editor-id', index);
                    element.addEventListener('click', (e) => handleElementClick(e, element));
                    element.addEventListener('mouseenter', (e) => handleElementHover(e, element));
                    element.addEventListener('mouseleave', (e) => handleElementUnhover(e, element));
                });
                
                isFrameReady = true;
                console.log('Editor initialized successfully');
                
            } catch (error) {
                console.error('Error initializing editor:', error);
                showError('Could not connect to your website. Make sure your worker has proxy endpoints.');
            }
        }

        function injectStyles() {
            if (!frameDocument) return;
            
            const styleElement = frameDocument.createElement('style');
            styleElement.id = 'editor-styles';
            styleElement.textContent = `
                .css-highlight {
                    outline: 3px solid #FF8C00 !important;
                    outline-offset: 3px !important;
                    background: rgba(255, 140, 0, 0.1) !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }
                
                .css-selected {
                    outline: 3px solid #28a745 !important;
                    outline-offset: 3px !important;
                    background: rgba(40, 167, 69, 0.15) !important;
                }
                
                * {
                    transition: all 0.2s ease !important;
                }
            `;
            
            if (frameDocument.head) {
                frameDocument.head.appendChild(styleElement);
            }
        }

        function handleElementClick(event, element) {
            event.preventDefault();
            event.stopPropagation();
            
            clearSelection();
            selectedElement = element;
            currentEditingElement = element;
            element.classList.add('css-selected');
            
            if (!originalStyles.has(element)) {
                originalStyles.set(element, element.style.cssText);
            }
            
            updateSidebar(element);
            updateClickHint('🎯 Editing selected item - click another part to change selection');
        }

        function handleElementHover(event, element) {
            if (element === selectedElement) return;
            element.classList.add('css-highlight');
        }

        function handleElementUnhover(event, element) {
            if (element === selectedElement) return;
            element.classList.remove('css-highlight');
        }

        function clearSelection() {
            if (!frameDocument) return;
            
            frameDocument.querySelectorAll('.css-highlight, .css-selected').forEach(el => {
                el.classList.remove('css-highlight', 'css-selected');
            });
        }

        function determineCssSelector(element) {
            // Priority: ID > specific class > generic tag
            if (element.id) {
                return `#${element.id}`;
            }
            
            if (element.className) {
                const classes = element.className.split(' ').filter(c => c.trim() && !c.startsWith('css-'));
                if (classes.length > 0) {
                    return `.${classes[0]}`;
                }
            }
            
            // For nested elements like img inside other elements
            const parent = element.parentElement;
            if (parent && parent.className) {
                const parentClasses = parent.className.split(' ').filter(c => c.trim() && !c.startsWith('css-'));
                if (parentClasses.length > 0) {
                    return `.${parentClasses[0]} ${element.tagName.toLowerCase()}`;
                }
            }
            
            return element.tagName.toLowerCase();
        }

        function updateSidebar(element) {
    // === DYNAMIC SIZE SLIDER BLOCK ===
    const textTags = ['p', 'span', 'a', 'label', 'li', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const isTextTag = textTags.includes(element.tagName.toLowerCase());
    const isImg = element.tagName.toLowerCase() === 'img';

    // Adjust "Size" control depending on element type
    if (isTextTag || elementHasUserText(element)) {
        // Treat any element that has visible text like a text element
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].property = 'font-size';
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].min = 10;
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].max = 120;
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].default =
            parseInt(frameWindow.getComputedStyle(element).fontSize) || 16;
    } else if (isImg) {
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].property = 'width';
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].min = 30;
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].max = 800;
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].default =
            parseInt(frameWindow.getComputedStyle(element).width) || 300;
    } else {
        // Non-text, non-image elements fall back to width control
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].property = 'width';
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].min = 50;
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].max = 800;
        SIMPLE_CONTROLS['Basic Adjustments']['Size'].default =
            parseInt(frameWindow.getComputedStyle(element).width) || 300;
    }
    // === END DYNAMIC SIZE SLIDER BLOCK ===

    const elementType = getElementType(element);
    const elementName = getElementName(element);
    const cssSelector = determineCssSelector(element);

    const controlsArea = document.getElementById('controlsArea');

    let html = `
        <div class="element-info">
            <div class="element-preview">
                <div class="element-icon">${getElementIcon(element)}</div>
                <div class="element-details">
                    <h3>${elementName}</h3>
                    <p>${elementType} element</p>
                    <div class="css-selector-info">CSS Selector: ${cssSelector}</div>
                </div>
            </div>
        </div>
        
        <div class="controls-container">
    `;

    // Add text editing button for ANY element with user-visible text
    if (elementHasUserText(element)) {
        html += `<button class="edit-text-btn" onclick="openTextEditor()">✏️ Edit Text Content</button>`;
    }

    // Add image actions for images
    if (element.tagName.toLowerCase() === 'img') {
        html += `
            <div class="image-actions">
                <button class="upload-btn" onclick="uploadImageForElement()">📁 Upload New</button>
                <button class="replace-btn" onclick="replaceImageForElementViaFile()">🔄 Replace</button>
                <button class="replace-existing-btn" onclick="replaceImageForElementWithExisting()">🔀 Replace w/ Existing</button>
            </div>
        `;
    }
    
    Object.entries(SIMPLE_CONTROLS).forEach(([groupName, controls]) => {
        html += `
            <div class="control-group">
                <h4>${groupName}</h4>
        `;
        Object.entries(controls).forEach(([controlName, config]) => {
            const currentValue = getCurrentValue(element, config);
            const controlId = `control-${config.property}`;
            
            html += `
                <div class="control-item">
                    <div class="control-label">
                        <span>${controlName}</span>
                        <span class="control-value" id="value-${controlId}">${formatValue(currentValue, config.unit)}</span>
                    </div>
                    <input 
                        type="range" 
                        class="control-slider"
                        id="${controlId}"
                        min="${config.min}"
                        max="${config.max}"
                        value="${currentValue}"
                        data-property="${config.property}"
                        data-unit="${config.unit}"
                        oninput="handleSliderChange(this)"
                    >
                </div>
            `;
        });
        html += '</div>';
    });

    html += `
    <button class="save-changes-btn" onclick="saveStyleChanges()">➕ Add to Staged</button>
        </div>
    `;

    controlsArea.innerHTML = html;
}

// Consider any element with visible text as 'Text'
function getElementType(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'img') return 'Image';
    if (tagName === 'button' || tagName === 'input') return 'Button';
    if (elementHasUserText(element)) return 'Text';
    if (['div', 'section', 'article', 'header', 'footer'].includes(tagName)) return 'Section';
    return 'Element';
}

function getElementName(element) {
    if (element.alt) return element.alt;
    if (element.title) return element.title;
    if (element.textContent && element.textContent.trim()) {
        return element.textContent.trim().substring(0, 30) + (element.textContent.trim().length > 30 ? '...' : '');
    }
    if (element.className) return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    if (element.id) return `${element.tagName.toLowerCase()}#${element.id}`;
    return element.tagName.toLowerCase();
}

function getElementIcon(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'img') return '🖼️';
    if (tagName === 'button' || tagName === 'input') return '🔘';
    if (elementHasUserText(element)) return '📝';
    if (['div', 'section', 'article'].includes(tagName)) return '📦';
    if (tagName === 'header') return '🏠';
    if (tagName === 'footer') return '🔚';
    return '⭐';
}

function getCurrentValue(element, config) {
    if (!frameWindow) return config.default;
    try {
        const computedStyle = frameWindow.getComputedStyle(element);
        switch (config.property) {
            case 'width': {
                const width = parseFloat(computedStyle.width) || config.default;
                return Math.min(Math.max(width, config.min), config.max);
            }
            case 'height': {
                const height = computedStyle.height;
                if (height === 'auto') return config.default;
                const heightValue = parseFloat(height) || config.default;
                return Math.min(Math.max(heightValue, config.min), config.max);
            }
            case 'border-radius': {
                const borderRadius = parseFloat(computedStyle.borderRadius) || config.default;
                return Math.min(Math.max(borderRadius, config.min), config.max);
            }
            case 'box-shadow': {
                const boxShadow = computedStyle.boxShadow;
                if (!boxShadow || boxShadow === 'none') return 0;
                const match = boxShadow.match(/(\d+)px/g);
                if (match && match.length >= 3) {
                    return Math.min(Math.max(parseInt(match[2]), config.min), config.max);
                }
                return 0;
            }
            case 'opacity': {
                const opacity = parseFloat(computedStyle.opacity) || 1;
                return Math.round(opacity * 100);
            }
            case 'margin': {
                const margin = parseFloat(computedStyle.margin) || config.default;
                return Math.min(Math.max(margin, config.min), config.max);
            }
            case 'padding': {
                const padding = parseFloat(computedStyle.padding) || config.default;
                return Math.min(Math.max(padding, config.min), config.max);
            }
            default:
                return config.default;
        }
    } catch (error) {
        console.error('Error getting current value:', error);
        return config.default;
    }
}

function formatValue(value, unit) {
    if (unit === '%') return Math.round(value) + '%';
    return Math.round(value) + unit;
}

// === Helpers to detect user-visible text ===
function elementHasUserText(el) {
    if (!el) return false;
    const text = getVisibleText(el);
    return text.length > 0;
}

function getVisibleText(el) {
    const doc = el.ownerDocument || document;
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node || !node.parentElement) return NodeFilter.FILTER_REJECT;
            const p = node.parentElement;
            const tag = p.tagName ? p.tagName.toLowerCase() : '';
            if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
            const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
            return t ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    let s = '';
    let n;
    while ((n = walker.nextNode())) {
        s += (n.textContent || '').replace(/\s+/g, ' ').trim() + ' ';
    }
    return s.trim();
}


// ====== UPDATED: slider handler calls applyStyleAndStage ======
function handleSliderChange(slider) {
    if (!selectedElement) return;

    const property = slider.dataset.property;
    const unit = slider.dataset.unit || '';
    const value = parseFloat(slider.value);

    // Update on-screen value display (keeps your existing formatValue util)
    const valueDisplay = document.getElementById(`value-control-${property}`);
    if (valueDisplay) {
        valueDisplay.textContent = formatValue(value, unit);
    } else {
        // fallback: try a couple other common id patterns
        const alt = document.getElementById(`value-control-${slider.id}`) || document.getElementById(`value-${'control-' + property}`);
        if (alt) alt.textContent = formatValue(value, unit);
    }

    // Apply the style live and stage it for a later bulk commit
    if (typeof applyStyleAndStage === 'function') {
        applyStyleAndStage(selectedElement, property, value, unit);
    } else {
        // Fallback to original immediate apply
        applyStyle(selectedElement, property, value, unit);
    }

    // Keep pendingChanges map for backward compatibility
    try {
        if (!window.pendingChanges) window.pendingChanges = {};
        if (!pendingChanges[selectedElement.tagName]) pendingChanges[selectedElement.tagName] = {};
        pendingChanges[selectedElement.tagName][property] = { value, unit };
    } catch (e) {
        // ignore silently if pendingChanges isn't available
    }
}


// ====== NEW: applyStyleAndStage helper (applies live + stages for batch commit) ======
function applyStyleAndStage(element, property, value, unit) {
    // Apply visual change using your existing applyStyle function (keeps behavior consistent)
    try {
        applyStyle(element, property, value, unit);
    } catch (e) {
        console.warn('applyStyle call failed inside applyStyleAndStage:', e);
    }

    // Ensure staging containers exist
    if (!window.pendingStyleEdits) window.pendingStyleEdits = {};
    if (!window.pendingChanges) window.pendingChanges = {};

    // Determine selector to stage under (use same algorithm as the editor)
    let selector;
    try {
        selector = determineCssSelector(element) || element.tagName.toLowerCase();
    } catch (e) {
        selector = element.tagName.toLowerCase();
    }

    // Normalize value string for CSS (opacity vs px/other)
    let valueStr;
    if (property === 'opacity') {
        valueStr = (value / 100).toString();
    } else if (unit && unit !== 'px') {
        valueStr = value + unit;
    } else {
        valueStr = value + 'px';
    }

    // Stage the style change into pendingStyleEdits
    window.pendingStyleEdits[selector] = window.pendingStyleEdits[selector] || {};
    window.pendingStyleEdits[selector][property] = valueStr;

    // Also update pendingChanges map for compatibility (keyed by tag)
    try {
        if (!pendingChanges[element.tagName]) pendingChanges[element.tagName] = {};
        pendingChanges[element.tagName][property] = { value, unit };
    } catch (e) {
        // ignore
    }

    // Update staged-badge UI if present
    try {
        const badge = document.getElementById('commitBadge');
        if (badge) {
            const total = (window.pendingTextEdits ? window.pendingTextEdits.length : 0)
        + (window.pendingColorEdits ? window.pendingColorEdits.length : 0)
        + Object.keys(window.pendingStyleEdits || {}).length;
            badge.textContent = `(${total} staged)`;
        }
    } catch (e) { /* ignore UI errors */ }
}


async function saveStyleChanges() {
    // New behavior: stage the selectedElement's inline styles for Save All
    if (!selectedElement || !currentEditingElement) {
        alert('No element selected to stage style changes for.');
        return;
    }

    // Grab inline styles (from live preview)
    const appliedStyles = selectedElement.style.cssText || '';
    if (!appliedStyles.trim()) {
        alert('No inline style changes to stage.');
        return;
    }

    try {
        // Parse applied styles into a prop -> value map
        const styleRules = {};
        appliedStyles.split(';').forEach(rule => {
            const [prop, val] = rule.split(':').map(s => s && s.trim());
            if (prop && val) {
                styleRules[prop] = val;
            }
        });

        // Determine a selector to stage the rule under
        const cssSelector = (typeof determineCssSelector === 'function') ? determineCssSelector(selectedElement) : selectedElement.tagName.toLowerCase();

        // Ensure staging container exists
        if (!window.pendingStyleEdits) window.pendingStyleEdits = {};

        // Merge staged rules (existing staged properties are preserved and merged)
        window.pendingStyleEdits[cssSelector] = window.pendingStyleEdits[cssSelector] || {};
        Object.assign(window.pendingStyleEdits[cssSelector], styleRules);

        // Maintain pendingChanges map for compatibility with other code
        try {
            if (!window.pendingChanges) window.pendingChanges = {};
            if (!window.pendingChanges[selectedElement.tagName]) window.pendingChanges[selectedElement.tagName] = {};
            Object.entries(styleRules).forEach(([prop, val]) => {
                // store numeric value and unit where possible for UI compatibility
                let numeric = parseFloat(val);
                let unit = (val.match(/[a-z%]+$/) || ['px'])[0];
                if (prop === 'opacity') {
                    // convert to 0-100 range expected by sliders
                    pendingChanges[selectedElement.tagName][prop] = { value: Math.round((parseFloat(val) || 0) * 100), unit: '%' };
                } else {
                    pendingChanges[selectedElement.tagName][prop] = { value: isNaN(numeric) ? val : numeric, unit };
                }
            });
        } catch (e) {
            // ignore if pendingChanges mapping fails
        }

        // UI feedback: update badge + notify user
        updateCommitBadge();
        setStatus('Styles staged (will publish on Save All)', 'success');
        alert('➕ Styles added to staged edits. Press Save All to publish.');

    } catch (error) {
        console.error('Error staging styles:', error);
        alert('❌ Error staging styles: ' + (error && error.message ? error.message : error));
    }
}


// ========== TEXT EDITING (STAGED BATCH + SAVE ALL) ==========
/*
Behavior:
- openTextEditor / closeTextEditor open the modal as before.
- saveTextEdit() now STAGES text edits (does not call GitHub).
- A "💾 Save All" button is injected next to the Reset button in the editor header.
- commitPendingChanges() applies all staged edits to index.html and commits once.
*/

window.pendingTextEdits = window.pendingTextEdits || [];    // array of { originalInnerHTML, originalTextContent, newText, tagName, className }
window.pendingStyleEdits = window.pendingStyleEdits || {};  // object: { selector: { prop: value, ... } }
window.pendingColorEdits = window.pendingColorEdits || [];   // array of {tagName,id,className,originalOuterHTML,newOuterHTML,textSnippet,colorHex}

// Inject Save All button (run once)

function ensureCommitButton() {
    // Ensure there is exactly one Save All button and one badge.
    const header = document.querySelector('.editor-preview-header');
    if (!header) return;

    // Remove any duplicate save-all-btns (keep the first occurrence)
    const allSaveBtns = Array.from(header.querySelectorAll('.save-all-btn'));
    if (allSaveBtns.length > 1) {
        for (let idx = 1; idx < allSaveBtns.length; idx++) {
            try { allSaveBtns[idx].remove(); } catch (e) { /* ignore */ }
        }
    }

    // Prefer existing commitChangesBtn if present
    let btn = document.getElementById('commitChangesBtn') || header.querySelector('.save-all-btn');

    // If there's a static button that isn't marked .save-all-btn but looks like one, adopt it
    if (!btn) {
        // try to find any button with title or text 'Save All' to adopt
        const candidates = header.querySelectorAll('button');
        for (const c of candidates) {
            const txt = (c.textContent || '').trim().toLowerCase();
            if (txt.includes('save all') || c.classList.contains('save-all-btn')) {
                btn = c;
                break;
            }
        }
    }

    // If no button exists, create one (only once)
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'save-all-btn';
        btn.id = 'commitChangesBtn';
        btn.textContent = '💾 Save All';
        btn.title = 'Commit all staged changes';
        // insert near reset button if available
        const resetBtn = header.querySelector('.reset-btn');
        if (resetBtn && resetBtn.parentNode) {
            resetBtn.parentNode.insertBefore(btn, resetBtn.nextSibling);
        } else {
            header.appendChild(btn);
        }
    } else {
        // Adopt existing button: ensure it has the expected class/id
        try {
            btn.classList.add('save-all-btn');
        } catch(e) {}
        if (!btn.id) btn.id = 'commitChangesBtn';
        else btn.id = 'commitChangesBtn';
    }

    // Attach the commit handler (idempotent)
    try { btn.onclick = commitPendingChanges; } catch(e){ console.warn('Could not attach commit handler', e); }

    // Ensure there is exactly one badge next to the button
    let badge = document.getElementById('commitBadge');
    if (badge && badge.parentNode && badge.parentNode !== btn.parentNode) {
        // move it next to the button
        try { btn.parentNode.insertBefore(badge, btn.nextSibling); } catch(e) {}
    }
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'commitBadge';
        badge.style.marginLeft = '8px';
        badge.style.fontSize = '0.9rem';
        badge.style.color = '#333';
        badge.textContent = '(0 staged)';
        try { btn.parentNode.insertBefore(badge, btn.nextSibling); } catch(e) { header.appendChild(badge); }
    }

    // Remove any other stray badges
    const allBadges = Array.from(header.querySelectorAll('#commitBadge'));
    if (allBadges.length > 1) {
        for (let i = 1; i < allBadges.length; i++) {
            try { allBadges[i].remove(); } catch(e){}
        }
    }

    // Update the badge immediately
    if (typeof updateCommitBadge === 'function') {
        try { updateCommitBadge(); } catch(e) { console.warn(e); }
    }
}

setTimeout(ensureCommitButton, 500);

// Helpers used in this section
function normalizeText(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function stripTags(html) { return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


// ===== Helpers for color editing =====
function normalizeHex(hex) {
    if (!hex) return '#000000';
    hex = hex.trim();
    if (hex[0] !== '#') hex = '#' + hex;
    if (/^#([0-9a-fA-F]{3})$/.test(hex)) {
        const m = hex.substring(1);
        return '#' + m[0]+m[0] + m[1]+m[1] + m[2]+m[2];
    }
    const m6 = /^#([0-9a-fA-F]{6})$/.exec(hex);
    return m6 ? '#' + m6[1].toUpperCase() : '#000000';
}

function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    const m = rgb.replace(/\s+/g,'').match(/^rgba?\((\d+),(\d+),(\d+)/i);
    if (!m) return normalizeHex(rgb);
    const r = Math.min(255, parseInt(m[1],10));
    const g = Math.min(255, parseInt(m[2],10));
    const b = Math.min(255, parseInt(m[3],10));
    const to2 = n => n.toString(16).padStart(2,'0').toUpperCase();
    return '#' + to2(r) + to2(g) + to2(b);
}

function ensureOpenTagColor(openTag, hex) {
    hex = normalizeHex(hex);
    var hasStyle = /\sstyle\s*=\s*"(.*?)"|\sstyle\s*=\s*'(.*?)'/.test(openTag);
    if (!hasStyle) {
        // insert style attribute before closing '>'
        return openTag.replace(/>\s*$/i, ' style="color:' + hex + '">');
    }
    // update or append color inside existing style attribute
    return openTag.replace(/(\sstyle\s*=\s*"(.*?)"|\sstyle\s*=\s*'(.*?)')/i, function(m, _full, dbl, sgl){
        var value = (dbl !== undefined ? dbl : sgl) || '';
        // remove any existing color declarations
        value = value.replace(/(^|\s*;\s*)color\s*:\s*[^;]+/ig, '').trim().replace(/^;|;$/g,'');
        value = value ? (value + ';color:' + hex) : ('color:' + hex);
        return ' style="' + value + '"';
    });
}


function injectColorBySnippet(html, snippet, hex) {
    try {
        var idx = html.indexOf(snippet);
        if (idx === -1) return html;

        var skipTags = { i:1, svg:1, path:1, img:1, use:1, br:1, hr:1, input:1, meta:1, link:1 };
        var cursor = idx;

        while (cursor > 0) {
            var lt = html.lastIndexOf('<', cursor);
            if (lt === -1) break;
            if (html.substr(lt, 2) === '</') { cursor = lt - 1; continue; }

            var gt = html.indexOf('>', lt);
            if (gt === -1) break;
            var openTag = html.slice(lt, gt + 1);
            var m = openTag.match(/^<\s*([a-zA-Z][\w:-]*)/);
            if (!m) { cursor = lt - 1; continue; }
            var tagName = m[1].toLowerCase();
            if (skipTags[tagName]) { cursor = lt - 1; continue; }

            var closeNeedle = '</' + tagName;
            var closePos = html.indexOf(closeNeedle, gt + 1);
            if (closePos !== -1 && closePos > idx) {
                var newOpen = ensureOpenTagColor(openTag, hex);
                if (newOpen !== openTag) {
                    return html.slice(0, lt) + newOpen + html.slice(gt + 1);
                }
                return html;
            }
            cursor = lt - 1;
        }

        var lt2 = html.lastIndexOf('<', idx);
        while (lt2 !== -1 && html.substr(lt2, 2) === '</') lt2 = html.lastIndexOf('<', lt2 - 1);
        if (lt2 !== -1) {
            var gt2 = html.indexOf('>', lt2);
            if (gt2 !== -1) {
                var open2 = html.slice(lt2, gt2 + 1);
                var newOpen2 = ensureOpenTagColor(open2, hex);
                if (newOpen2 !== open2) {
                    return html.slice(0, lt2) + newOpen2 + html.slice(gt2 + 1);
                }
            }
        }
        return html;
    } catch(e) { return html; }
}
function openTextEditor() {
    if (!selectedElement) return;
    const modal = document.getElementById('textEditorModal');
    const textarea = document.getElementById('textEditorTextarea');
    textarea.value = selectedElement.textContent || selectedElement.innerText || '';

    // init color inputs
    try {
        const picker = document.getElementById('textColorPicker');
        const hexInput = document.getElementById('textColorHex');
        if (picker && hexInput) {
            const win = document.getElementById('previewFrame')?.contentWindow || window;
            const computed = win.getComputedStyle(selectedElement).color;
            const hex = normalizeHex(rgbToHex(computed));
            picker.value = hex;
            hexInput.value = hex;
        }
    } catch(e) { /* ignore */ }

    modal.style.display = 'flex';
}

function closeTextEditor() {
    document.getElementById('textEditorModal').style.display = 'none';
}

// When the user saves text in the modal, stage the edit instead of committing immediately.
async function saveTextEdit() {
    const newText = document.getElementById('textEditorTextarea').value;
    if (!selectedElement) return;

    const originalInnerHTML = selectedElement.innerHTML;
    const originalTextContent = (selectedElement.textContent || selectedElement.innerText || '').trim();
    const tagName = selectedElement.tagName ? selectedElement.tagName.toLowerCase() : '';
    const className = (selectedElement.className || '').split(' ')[0] || '';

    // Live preview update immediately
    selectedElement.textContent = newText;

    // Stage the edit
    window.pendingTextEdits.push({
        originalInnerHTML,
        originalTextContent,
        newText,
        tagName,
        className
    });

    updateCommitBadge();
    closeTextEditor();
    setStatus('Text staged (not published yet)', 'success');
}

// Update badge showing number of staged edits
function updateCommitBadge() {
    const badge = document.getElementById('commitBadge');
    if (!badge) return;
    const total = (window.pendingTextEdits ? window.pendingTextEdits.length : 0)
        + (window.pendingColorEdits ? window.pendingColorEdits.length : 0)
        + Object.keys(window.pendingStyleEdits || {}).length;
    badge.textContent = `(${total} staged)`;
}

// ========== STYLE STAGING (lightweight) ==========
/*
If you already have an applyStyle() usage, change it to call applyStyleAndStage(element, property, value, unit)
instead of the old one. This small function both applies the style live and records it for the staged CSS block.
*/
function applyStyleAndStage(element, property, value, unit) {
    try {
        switch (property) {
            case 'width': element.style.width = value + 'px'; break;
            case 'height': element.style.height = value + 'px'; break;
            case 'border-radius': element.style.borderRadius = value + 'px'; break;
            case 'box-shadow': element.style.boxShadow = `0 ${value}px ${Math.max(2, value)}px rgba(0,0,0,0.15)`; break;
            case 'opacity': element.style.opacity = (value / 100).toString(); break;
            case 'margin': element.style.margin = value + 'px'; break;
            case 'padding': element.style.padding = value + 'px'; break;
            default: element.style[property] = value + (unit || ''); break;
        }
    } catch (e) {
        console.warn('applyStyleAndStage error:', e);
    }

    try {
        const selector = determineCssSelector(element) || element.tagName.toLowerCase();
        window.pendingStyleEdits[selector] = window.pendingStyleEdits[selector] || {};
        let valueStr = (property === 'opacity') ? (value / 100).toString() : (value + (unit || (property === 'opacity' ? '' : 'px')));
        window.pendingStyleEdits[selector][property] = valueStr;
        updateCommitBadge();
    } catch (e) {
        console.warn('Could not stage style change:', e);
    }
}

// ========== COMMIT ALL STAGED CHANGES ==========

// Helper: save file to GitHub via backend with retries. Uses fetchFileSha to get latest sha.
async function saveFileWithRetries(filename, content, options) {
    options = options || { attempts: 5, pauseMs: 150 };
    let lastErr = null;
    for (let attempt = 1; attempt <= (options.attempts || 5); attempt++) {
        try {
            let fileSha = null;
            try { fileSha = await fetchFileSha(filename); } catch(e) { fileSha = null; }
            const body = {
                repo: GITHUB_REPOPATH,
                path: filename,
                content: content,
                message: `Edit ${filename} via dashboard`,
                branch: 'main',
                sha: fileSha
            };
            const resp = await apiFetch("/github/edit-file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"},
                body: JSON.stringify(body)
            });
            if (resp.ok) {
                try { return await resp.json(); } catch(e) { return null; }
            } else {
                // read text clone to avoid body consumed errors
                try {
                    const txt = await resp.clone().text();
                    try { lastErr = JSON.parse(txt); } catch(jsE) { lastErr = { status: resp.status, text: txt }; }
                } catch(e) {
                    lastErr = { status: resp.status };
                }
            }
        } catch (e) {
            lastErr = e;
        }
        // exponential backoff
        const pause = (options.pauseMs || 150) * attempt;
        await new Promise(res => setTimeout(res, pause));
    }
    throw lastErr || new Error('Failed to save file: ' + filename);
}

async function saveIndexHtmlWithImmediateShaRetries(htmlContent, options) {
    return await saveFileWithRetries('index.html', htmlContent, options);
}

async function saveStyleCssWithImmediateShaRetries(cssContent, options) {
    return await saveFileWithRetries('style.css', cssContent, options);
}
async function commitPendingChanges() {
    const totalStaged = (window.pendingTextEdits ? window.pendingTextEdits.length : 0)
        + (window.pendingColorEdits ? window.pendingColorEdits.length : 0)
        + Object.keys(window.pendingStyleEdits || {}).length;
    if (!totalStaged) { alert('No staged changes.'); return; }
    if (!confirm(`Publish ${totalStaged} staged change(s) to the site now?`)) return;

    setStatus('Building staged commit...', 'success');

    // Fetch current index.html via proxy
    const htmlResp = await fetch(`${APIBASE}/proxy/index.html`, {
        headers: { }
    });
    if (!htmlResp.ok) { alert('Could not load index.html via proxy for commit.'); return; }
    let htmlContent = await htmlResp.text();

    // Apply all staged text edits in order
    for (const edit of (window.pendingTextEdits || [])) {
        const { originalInnerHTML, originalTextContent, newText, tagName, className } = edit;
        let replaced = false;

        // Strategy A: exact originalInnerHTML replace (first occurrence)
        if (!replaced && originalInnerHTML && htmlContent.indexOf(originalInnerHTML) !== -1) {
            const newInner = createPreservedHTML(originalInnerHTML, originalTextContent, newText);
            htmlContent = replaceFirstOccurrence(htmlContent, originalInnerHTML, newInner);
            replaced = true;
        }

        // Strategy B: class-based tag match
        if (!replaced && className) {
            const tag = tagName || 'div';
            const classEsc = escapeRegex(className);
            const regex = new RegExp(`(<${tag}[^>]*class=(?:"[^"]*${classEsc}[^"]*"|'[^']*${classEsc}[^']*')[^>]*>)([\\s\\S]*?)(</${tag}>)`, 'i');
            htmlContent = htmlContent.replace(regex, (m, openTag, content, closeTag) => {
                if (!originalTextContent) return m;
                const contentText = stripTags(content).replace(/\s+/g,' ');
                if (contentText.includes(originalTextContent.replace(/\s+/g,' '))) {
                    replaced = true;
                    return openTag + createPreservedHTML(content, originalTextContent, newText) + closeTag;
                }
                return m;
            });
        }

        // Strategy C: tag-level fallback
        if (!replaced && tagName) {
            const tag = tagName;
            const tagRegex = new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(</${tag}>)`, 'gi');
            htmlContent = htmlContent.replace(tagRegex, (m, openTag, content, closeTag) => {
                if (replaced) return m;
                const contentText = stripTags(content).replace(/\s+/g,' ');
                if (!originalTextContent || contentText.includes(originalTextContent)) {
                    replaced = true;
                    return openTag + createPreservedHTML(content, originalTextContent, newText) + closeTag;
                }
                return m;
            });
        }

        // Final fallback: plain text replace
        if (!replaced && originalTextContent && htmlContent.indexOf(originalTextContent) !== -1) {
            htmlContent = htmlContent.replace(originalTextContent, newText);
            replaced = true;
        }

        if (!replaced) console.warn('Could not find text in HTML during commit for edit:', edit);
    }


    
    // Apply color-only edits (inline style on opening tag)
    let _colorChangesApplied = 0;
    for (const edit of (window.pendingColorEdits || [])) {
        const { originalOuterHTML, newOuterHTML, tagName, id, className, textSnippet, colorHex } = edit;
        let replacedColor = false;
        // Strategy A: exact outerHTML replace
        if (!replacedColor && originalOuterHTML && htmlContent.indexOf(originalOuterHTML) !== -1) {
            htmlContent = replaceFirstOccurrence(htmlContent, originalOuterHTML, newOuterHTML);
            _colorChangesApplied++;
            replacedColor = true;
        }
        // Strategy B: ID-based opening tag update
        if (!replacedColor && id) {
            const idEsc = escapeRegex(id);
            const tag = tagName || '[a-zA-Z]+';
            const openTagRegex = new RegExp(`(<${tag}[^>]*id=["']${idEsc}["'][^>]*)(>)`, 'i');
            htmlContent = htmlContent.replace(openTagRegex, (m, openTag, close) => { _colorChangesApplied++;
                replacedColor = true;
                return ensureOpenTagColor(openTag, colorHex) + close;
            });
        }
        // Strategy C: class+text snippet
        if (!replacedColor && className && textSnippet) {
            const classEsc = escapeRegex(className);
            const snippetEsc = escapeRegex(textSnippet);
            const tag = tagName || '[a-zA-Z]+';
            const blockRegex = new RegExp(`(<${tag}[^>]*class=["'][^"']*${classEsc}[^"']*["'][^>]*>)([\s\S]*?${snippetEsc}[\s\S]*?)(</${tag}>)`, 'i');
            htmlContent = htmlContent.replace(blockRegex, (m, openTag, mid, closeTag) => { _colorChangesApplied++; _colorChangesApplied++;
                replacedColor = true;
                return ensureOpenTagColor(openTag, colorHex) + mid + closeTag;
            });
        }
        // Strategy D: first tag containing snippet
        if (!replacedColor && textSnippet && tagName) {
            const snippetEsc = escapeRegex(textSnippet);
            const blockRegex = new RegExp(`(<${tagName}[^>]*>)([\s\S]*?${snippetEsc}[\s\S]*?)(</${tagName}>)`, 'i');
            htmlContent = htmlContent.replace(blockRegex, (m, openTag, mid, closeTag) => { _colorChangesApplied++; _colorChangesApplied++;
                replacedColor = true;
                return ensureOpenTagColor(openTag, colorHex) + mid + closeTag;
            });
        }
        // Final fallback: direct snippet injection
        if (!replacedColor && textSnippet) {
            const before = htmlContent;
            htmlContent = injectColorBySnippet(htmlContent, textSnippet, colorHex);
            if (before !== htmlContent) { replacedColor = true; _colorChangesApplied++; }
        }
    }
    if (_colorChangesApplied === 0 && (window.pendingColorEdits||[]).length>0) {
        console.warn('No color edits applied: fallbacks exhausted.');
    }
// Apply staged style edits to style.css (update :root and staged block)
    if (Object.keys(window.pendingStyleEdits || {}).length > 0) {
        // Fetch current style.css via proxy
        const cssResp2 = await fetch(`${APIBASE}/proxy/style.css`, {
            headers: { }
        });
        if (!cssResp2.ok) { alert('Could not load style.css via proxy for commit.'); return; }
        let cssContent2 = await cssResp2.text();

        // If there are :root variable edits, update the existing :root block directly in the loaded CSS
        if (window.pendingStyleEdits && window.pendingStyleEdits[':root']) {
            try {
                cssContent2 = updateRootVariables(cssContent2, window.pendingStyleEdits[':root']);
                // remove :root from pending edits so it won't be duplicated in the staged block
                delete window.pendingStyleEdits[':root'];
            } catch (e) {
                console.warn('Failed to apply :root variable updates:', e);
            }
        }

        // Build cssRules from remaining pendingStyleEdits (after :root possibly removed)
        const cssRules2 = [];
        for (const selector of Object.keys(window.pendingStyleEdits || {})) {
            const props = window.pendingStyleEdits[selector];
            const declarations = Object.entries(props).map(([k,v]) => `${k}: ${v};`).join(' ');
            cssRules2.push(`${selector} { ${declarations} }`);
        }

        const stagedBlockStart = '/* editor-staged-styles START */';
        const stagedBlockEnd = '/* editor-staged-styles END */';
        if (cssRules2.length > 0) {
            const stagedBlock = `${stagedBlockStart}\n${cssRules2.join('\n')}\n${stagedBlockEnd}`;
            if (cssContent2.indexOf(stagedBlockStart) !== -1 && cssContent2.indexOf(stagedBlockEnd) !== -1) {
                // replace existing block
                cssContent2 = cssContent2.replace(new RegExp(`${stagedBlockStart}[\\s\\S]*?${stagedBlockEnd}`, 'i'), stagedBlock);
            } else {
                // append at end
                cssContent2 = cssContent2 + '\n\n' + stagedBlock;
            }
        } else {
            // No remaining staged rules: remove existing staged block if any
            if (cssContent2.indexOf(stagedBlockStart) !== -1 && cssContent2.indexOf(stagedBlockEnd) !== -1) {
                cssContent2 = cssContent2.replace(new RegExp(`${stagedBlockStart}[\\s\\S]*?${stagedBlockEnd}`, 'i'), '');
            }
        }

        setStatus('Attempting to publish staged CSS...', 'success');
        try {
            await saveStyleCssWithImmediateShaRetries(cssContent2, { attempts: 6, pauseMs: 120 });
            setStatus('Published staged CSS ✔', 'success');
        } catch (err) {
            console.error('Failed to publish CSS changes:', err);
            alert('Failed to publish CSS changes. See console.');
            return;
        }
    }

    setStatus('Attempting to publish staged changes...', 'success');

    // Save the assembled index.html with immediate SHA retries
    try {
        await saveIndexHtmlWithImmediateShaRetries(htmlContent, { attempts: 6, pauseMs: 120 });
        setStatus('Published staged changes ✔', 'success');
        alert('All staged edits published!');
        window.pendingTextEdits = [];
        window.pendingStyleEdits = {};
        window.pendingColorEdits = [];
        updateCommitBadge();
        loadPreviewFromProxy(); // refresh preview iframe
    } catch (err) {
        console.error('Failed to publish staged changes:', err);
        alert('❌ Failed to publish staged changes: ' + (err && err.message ? err.message : err) + '\n\nPlease wait up to 1 minute between commits/updates and try again.');
        setStatus('', 'error');
    }
}


// Save index.html with immediate SHA fetch and retries (no worker changes required)
async function saveIndexHtmlWithImmediateShaRetries(content, opts = {}) {
    const attempts = opts.attempts || 6;
    const pauseMs = typeof opts.pauseMs === 'undefined' ? 120 : opts.pauseMs;
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
        try {
            const fileSha = await fetchFileSha('index.html');
            if (!fileSha) {
                // try create
                const createResp = await apiFetch("/github/create-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify({ repo: GITHUB_REPOPATH, path: 'index.html', content, message: `Create index.html via staged editor`, branch: "main" })
                });
                if (createResp.ok) return true;
                const createErr = await createResp.json().catch(() => ({}));
                lastErr = createErr.message || 'create-file failed';
                await sleep(pauseMs);
                continue;
            }

            const editResp = await apiFetch("/github/edit-file", {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({ repo: GITHUB_REPOPATH, path: 'index.html', content, message: `Publish staged edits via CMS`, branch: "main", sha: fileSha })
            });

            if (editResp.ok) return true;
            const editErr = await editResp.json().catch(() => ({}));
            lastErr = editErr.message || 'edit-file error';

            if (lastErr && lastErr.toString().toLowerCase().includes('does not match')) {
                await sleep(pauseMs);
                continue;
            }
            throw new Error(lastErr);
        } catch (e) {
            lastErr = (e && e.message) ? e.message : e;
            if (i === attempts - 1) throw new Error(lastErr || 'Unknown save error');
            await sleep(pauseMs);
        }
    }
    throw new Error(lastErr || 'Timed out saving');
}

// small helper: replace only the first occurrence (literal needle)
function replaceFirstOccurrence(haystack, needle, replacement) {
    const idx = haystack.indexOf(needle);
    if (idx === -1) return haystack;
    return haystack.slice(0, idx) + replacement + haystack.slice(idx + needle.length);
}

// ======= createPreservedHTML (keeps tags intact while changing text nodes) =======
function createPreservedHTML(originalHTML, originalText, newText) {
    if (!/<[a-z][\s\S]*>/i.test(originalHTML) && originalHTML.trim() === (originalText || '').trim()) {
        return newText;
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHTML;
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    if (!nodes.length) return newText;

    const SEP = '<<<NODE_SEP_STAGED>>>';
    const concat = nodes.map(n => n.textContent || '').join(SEP);
    const origTrim = (originalText || '').trim();

    if (origTrim && concat.includes(origTrim)) {
        const newConcat = concat.replace(origTrim, newText);
        const parts = newConcat.split(SEP);
        for (let i = 0; i < nodes.length; i++) nodes[i].textContent = parts[i] !== undefined ? parts[i] : '';
        return tempDiv.innerHTML;
    }

    // fallback: replace first non-empty text node
    for (let i = 0; i < nodes.length; i++) {
        if ((nodes[i].textContent || '').trim()) {
            nodes[i].textContent = newText;
            return tempDiv.innerHTML;
        }
    }
    return newText;
}







        // ========== IMAGE HANDLING IN CSS EDITOR ==========
        function uploadImageForElement() {
            showImageUploader();
        }

        function replaceImageForElementViaFile() {
            if (!selectedElement || selectedElement.tagName.toLowerCase() !== 'img') return;
            
            const imgSrc = selectedElement.src;
            const imgName = imgSrc.split('/').pop();
            
            // Find the image in our list and replace it via file upload
            replaceImage(imgName, ''); // SHA will be found automatically
        }

        function replaceImageForElementWithExisting() {
            if (!selectedElement || selectedElement.tagName.toLowerCase() !== 'img') return;
            
            const imgSrc = selectedElement.src;
            const imgName = imgSrc.split('/').pop();
            
            // Find the image in our list and show the existing image selector
            const targetImage = allImages.find(img => img.name === imgName);
            if (targetImage) {
                showReplaceWithExisting(targetImage.name, targetImage.sha);
            } else {
                alert('Could not find image in database. Please refresh and try again.');
            }
        }

        function resetAllStyles() {
            if (!frameDocument) return;
            
            originalStyles.forEach((originalStyle, element) => {
                try {
                    element.style.cssText = originalStyle;
                } catch (error) {
                    console.error('Error resetting element style:', error);
                }
            });
            
            clearSelection();
            selectedElement = null;
            currentEditingElement = null;
            pendingChanges = {};
            
            const controlsArea = document.getElementById('controlsArea');
            controlsArea.innerHTML = `
                <div class="welcome-message">
                    <div class="icon">🖱️</div>
                    <h3>Ready to customize!</h3>
                    <p>Click on any image, text, button, or section in your website preview to start editing its appearance.</p>
                </div>
            `;
            
            updateClickHint('👆 Click anything in the preview to start editing');
        }

        function updateClickHint(message) {
            const clickHint = document.getElementById('clickHint');
            if (clickHint) {
                clickHint.textContent = message;
            }
        }

        function showError(message) {
            const controlsArea = document.getElementById('controlsArea');
            controlsArea.innerHTML = `
                <div class="welcome-message">
                    <div class="icon">⚠️</div>
                    <h3>Connection Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }

        console.log('Advanced CMS Dashboard with CORS proxy support loaded successfully');

// Wire color picker <-> hex input sync
(function(){
    function syncFromPicker(){
        const picker = document.getElementById('textColorPicker');
        const hexInput = document.getElementById('textColorHex');
        if (!picker || !hexInput) return;
        hexInput.value = normalizeHex(picker.value);
    }
    function syncFromHex(){
        const picker = document.getElementById('textColorPicker');
        const hexInput = document.getElementById('textColorHex');
        if (!picker || !hexInput) return;
        const val = normalizeHex(hexInput.value);
        hexInput.value = val;
        try { picker.value = val; } catch(e){/* ignore invalid */}
    }
    try {
        document.addEventListener('input', function(e){
            if (e.target && e.target.id === 'textColorPicker') syncFromPicker();
            if (e.target && e.target.id === 'textColorHex') syncFromHex();
        });
    } catch(e){}
})();


// Save only color change for selected text element by staging inline style="color:#XXXXXX"
function saveTextColor() {
    if (!selectedElement) { alert('No element selected.'); return; }
    const picker = document.getElementById('textColorPicker');
    const hexInput = document.getElementById('textColorHex');
    const hex = normalizeHex((hexInput && hexInput.value) || (picker && picker.value) || '#000000');

    // Capture BEFORE
    const originalOuterHTML = selectedElement.outerHTML;
    const tagName = (selectedElement.tagName || '').toLowerCase();
    const id = selectedElement.id || '';
    const className = (selectedElement.className || '').toString().split(' ')[0] || '';
    const textSnippet = (selectedElement.textContent || selectedElement.innerText || '').trim().substring(0, 80);

    // Apply live preview
    try { selectedElement.style.color = hex; } catch(e){}

    const newOuterHTML = selectedElement.outerHTML;

    window.pendingColorEdits = window.pendingColorEdits || [];
    window.pendingColorEdits.push({
        tagName, id, className, textSnippet, colorHex: hex,
        originalOuterHTML, newOuterHTML
    });

    updateCommitBadge();
    setStatus('Color staged (not published yet)', 'success');
}