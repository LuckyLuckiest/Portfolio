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
