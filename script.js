const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('#nav-menu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

// Scroll to top button
(function setupScrollTop(){
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 7-1.41 1.41L13 9.83V20h-2V9.83l-4.59 4.58L5 12z"/></svg>';
  document.body.appendChild(btn);

  const toggle = () => {
    const show = window.scrollY > 320;
    btn.classList.toggle('show', show);
  };
  window.addEventListener('scroll', toggle, { passive: true });
  window.addEventListener('resize', toggle);
  toggle();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// GitHub README + file tree viewer for project pages
(async function setupGithubIntegration(){
  const cfg = window.__PROJECT_REPO__;
  if (!cfg) return;
  const { owner, repo, branch = 'main' } = cfg;

  const readmeEl = document.getElementById('readme');
  const treeEl = document.getElementById('repo-tree');
  const codeEl = document.getElementById('code-viewer');
  if (!readmeEl || !treeEl || !codeEl) return;

  const ghApi = (path) => `https://api.github.com/repos/${owner}/${repo}/${path}`;
  const rawUrl = (path) => `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  // Fetch README (raw)
  try {
    const res = await fetch(ghApi(`readme`));
    if (res.ok) {
      const data = await res.json();
      const md = atob(data.content || '');
      readmeEl.textContent = md;
      // Simple markdown fallback; try to convert basic headings/links minimally
      readmeEl.innerHTML = md
        .replace(/^# (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*)$/gm, '<h5>$1</h5>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1<\/a>')
        .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1<\/code><\/pre>')
        .replace(/`([^`]+)`/g, '<code>$1<\/code>')
        .replace(/\n/g, '<br/>');
    } else {
      readmeEl.textContent = 'README not found.';
    }
  } catch (e) {
    readmeEl.textContent = 'Failed to load README.';
  }

  // Fetch repository tree
  let files = [];
  try {
    const res = await fetch(ghApi(`git/trees/${branch}?recursive=1`));
    if (res.ok) {
      const data = await res.json();
      files = (data.tree || []).filter((n) => n.type === 'blob');
    }
  } catch {}

  // Build nested tree structure
  const root = {};
  for (const f of files) {
    const parts = f.path.split('/');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        cur[part] = { __file: true, path: f.path };
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
      return { wrap: details, list: container };
    }
    return { wrap: container, list: container };
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
          codeEl.textContent = 'Loading…';
          try {
            const r = await fetch(rawUrl(val.path));
            codeEl.textContent = r.ok ? await r.text() : 'Failed to load file.';
          } catch {
            codeEl.textContent = 'Failed to load file.';
          }
        });
        li.appendChild(btn);
        parentEl.appendChild(li);
      } else {
        const { wrap, list } = createTree(val, key);
        parentEl.appendChild(wrap);
        build(list, val);
      }
    }
  };

  const { wrap } = createTree(root);
  treeEl.appendChild(wrap);
  build(wrap, root);
})();


