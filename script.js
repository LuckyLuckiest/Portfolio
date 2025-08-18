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
(function setupScrollTop() {
    const btn = document.createElement('button');
    btn.className = 'scroll-top';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 7-1.41 1.41L13 9.83V20h-2V9.83l-4.59 4.58L5 12z"/></svg>';
    document.body.appendChild(btn);

    const toggle = () => {
        const show = window.scrollY > 320;
        btn.classList.toggle('show', show);
    };
    window.addEventListener('scroll', toggle, {passive: true});
    window.addEventListener('resize', toggle);
    toggle();

    btn.addEventListener('click', () => {
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
})();

// Shared navbar injection with Projects dropdown
(function setupSharedNavbar() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    // Project pages list
    const isInProjects = /\/projects\//.test(location.pathname);
    const base = isInProjects ? '..' : '.';
    const projects = [{
        name: 'Shared Online Document', href: `${base}/projects/shared_online_document.html`
    }, {
        name: 'Minecraft Plugin', href: `${base}/projects/gangland_warfare.html`
    }, {name: 'Vulnerability Scanner CLI', href: `${base}/projects/vuln-scanner.html`}];

    // If already present, avoid duplicate dropdown
    if (nav.querySelector('.dropdown')) return;

    const navList = nav.querySelector('#nav-menu');
    if (!navList) return;
    const li = document.createElement('li');
    li.className = 'dropdown';
    li.setAttribute('aria-expanded', 'false');
    const btn = document.createElement('button');
    btn.className = 'dropdown-toggle';
    btn.type = 'button';
    btn.innerHTML = 'Projects <span class="chev">▾</span>';
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    for (const p of projects) {
        const a = document.createElement('a');
        a.href = p.href;
        a.textContent = p.name;
        menu.appendChild(a);
    }
    li.appendChild(btn);
    li.appendChild(menu);
    navList.appendChild(li);

    btn.addEventListener('click', () => {
        const expanded = li.getAttribute('aria-expanded') === 'true';
        li.setAttribute('aria-expanded', String(!expanded));
    });
    document.addEventListener('click', (e) => {
        if (!li.contains(e.target)) li.setAttribute('aria-expanded', 'false');
    });
})();
