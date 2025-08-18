// GitHub integration and helpers (README, tree, code viewer with highlighting)

function loadOnce(key, loader) {
    const globalKey = `__loaded_${key}`;
    if (window[globalKey]) return window[globalKey];
    window[globalKey] = loader();
    return window[globalKey];
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.defer = true;
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
    });
}

function loadCss(href) {
    return new Promise((resolve, reject) => {
        const el = document.createElement('link');
        el.rel = 'stylesheet';
        el.href = href;
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
    });
}

async function ensureHighlightReady() {
    await loadOnce('hljs-css', () => loadCss('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'));
    await loadOnce('hljs-core', () => loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'));
    await loadOnce('hljs-ln', () => loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js'));
}

function inferLanguageFromPath(path) {
    const ext = (path.split('.').pop() || '').toLowerCase();
    const map = {
        js: 'javascript',
        cjs: 'javascript',
        mjs: 'javascript',
        ts: 'typescript',
        java: 'java',
        py: 'python',
        md: 'markdown',
        json: 'json',
        yml: 'yaml',
        yaml: 'yaml',
        xml: 'xml',
        html: 'xml',
        css: 'css',
        sh: 'bash',
        bash: 'bash',
        gradle: 'gradle',
        properties: 'properties'
    };
    return map[ext] || '';
}

function highlightAndNumber(preEl, codeText, languageHint) {
    preEl.innerHTML = '';
    const code = document.createElement('code');
    if (languageHint) code.className = `language-${languageHint}`;
    code.textContent = codeText;
    preEl.appendChild(code);
    if (window.hljs) {
        try {
            window.hljs.highlightElement(code);
        } catch {
        }
        try {
            if (window.hljs.lineNumbersBlock) window.hljs.lineNumbersBlock(code);
        } catch {
        }
    }
}

function readTokenFromLocation() {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return q.get('gh_token') || h.get('gh_token') || '';
}

function getGithubToken() {
    return window.__GITHUB_TOKEN__ || sessionStorage.getItem('gh_token') || '';
}

function setGithubToken(token) {
    if (token) sessionStorage.setItem('gh_token', token);
}

async function fetchGithub(url, options = {}) {
    const token = getGithubToken();
    const headers = Object.assign({'Accept': 'application/vnd.github.v3+json'}, options.headers || {});
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return await fetch(url, Object.assign({}, options, {headers}));
}

function renderAuthBox(parentAfterEl, onSave) {
    const box = document.createElement('div');
    box.className = 'auth-box';
    box.innerHTML = `
    <strong>Private repository</strong> – enter a GitHub token with repo scope:
    <div style="display:flex; gap:8px; margin-top:8px;">
      <input type="password" placeholder="ghp_..." aria-label="GitHub token" style="flex:1; min-width: 200px;" />
      <button class="btn" type="button">Save</button>
    </div>
    <div style="color:var(--muted); font-size:12px; margin-top:6px;">Token is kept only in this session (sessionStorage).</div>
  `;
    parentAfterEl.insertAdjacentElement('afterend', box);
    const input = box.querySelector('input');
    const btn = box.querySelector('button');
    btn.addEventListener('click', () => {
        const tok = input.value.trim();
        if (tok) {
            setGithubToken(tok);
            onSave && onSave(tok);
            box.remove();
        }
    });
    return box;
}

let authPromptShown = false;

function showAuthPrompt(targetEl, onSave) {
    if (authPromptShown) return;
    authPromptShown = true;
    renderAuthBox(targetEl, onSave);
}

(async function setupGithubIntegration() {
    const cfg = window.__PROJECT_REPO__;
    if (!cfg) return;
    const {owner, repo, branch = 'main'} = cfg;

    const urlToken = readTokenFromLocation();
    if (urlToken) setGithubToken(urlToken);

    const readmeEl = document.getElementById('readme');
    const treeEl = document.getElementById('repo-tree');
    const codeEl = document.getElementById('code-viewer');
    if (!readmeEl || !treeEl || !codeEl) return;

    const ghApi = (path) => `https://api.github.com/repos/${owner}/${repo}/${path}`;

    try {
        const res = await fetchGithub(ghApi(`readme`));
        if (!res.ok) {
            readmeEl.textContent = 'README not found.';
        } else {
            const data = await res.json();
            const md = atob(data.content || '');
            readmeEl.textContent = md;
            readmeEl.innerHTML = md
                .replace(/^# (.*)$/gm, '<h3>$1</h3>')
                .replace(/^## (.*)$/gm, '<h4>$1</h4>')
                .replace(/^### (.*)$/gm, '<h5>$1</h5>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\[(.*?)]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1<\/a>')
                .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1<\/code><\/pre>')
                .replace(/`([^`]+)`/g, '<code>$1<\/code>')
                .replace(/\n/g, '<br/>');
        }
    } catch (e) {
        readmeEl.textContent = 'Failed to load README.';
    }

    let files = [];
    try {
        const res = await fetchGithub(ghApi(`git/trees/${encodeURIComponent(branch)}?recursive=1`));
        if (res.status === 401 || res.status === 403 || res.status === 404) {
            showAuthPrompt(treeEl, async () => window.location.reload());
        } else if (res.ok) {
            const data = await res.json();
            files = (data.tree || []).filter((n) => n.type === 'blob');
        }
    } catch {
    }

    const root = {};
    for (const f of files) {
        const parts = f.path.split('/');
        let cur = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            if (isFile) {
                cur[part] = {__file: true, path: f.path};
            } else {
                cur[part] = cur[part] || {};
                cur = cur[part];
            }
        }
    }

    const createTree = (node, name) => {
        const container = document.createElement('ul');
        if (name) {
            const details = document.createElement('details');
            details.open = true;
            const summary = document.createElement('summary');
            summary.textContent = name;
            details.appendChild(summary);
            details.appendChild(container);
            return {wrap: details, list: container};
        }
        return {wrap: container, list: container};
    };

    const build = (parentEl, obj) => {
        for (const key of Object.keys(obj).sort()) {
            const val = obj[key];
            if (val && val.__file) {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.className = 'file';
                btn.textContent = key;
                btn.addEventListener('click', async () => {
                    parentEl.querySelectorAll('button.file.active').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    const codeEl = document.getElementById('code-viewer');
                    if (!codeEl) return;
                    codeEl.textContent = 'Loading…';
                    try {
                        const apiUrl = ghApi(`contents/${encodeURIComponent(val.path)}?ref=${encodeURIComponent(branch)}`);
                        const r = await fetchGithub(apiUrl);
                        if (r.status === 401 || r.status === 403 || r.status === 404) {
                            showAuthPrompt(treeEl, async () => btn.click());
                            codeEl.textContent = 'Authentication required to load file.';
                            return;
                        }
                        if (!r.ok) {
                            codeEl.textContent = 'Failed to load file.';
                            return;
                        }
                        const data = await r.json();
                        const text = data.encoding === 'base64' ? atob(data.content || '') : (data.content || '');
                        await ensureHighlightReady();
                        const lang = inferLanguageFromPath(val.path);
                        highlightAndNumber(codeEl, text, lang);
                    } catch {
                        codeEl.textContent = 'Failed to load file.';
                    }
                });
                li.appendChild(btn);
                parentEl.appendChild(li);
            } else {
                const {wrap, list} = createTree(val, key);
                parentEl.appendChild(wrap);
                build(list, val);
            }
        }
    };

    const {wrap} = createTree(root);
    treeEl.appendChild(wrap);
    build(wrap, root);
})();
