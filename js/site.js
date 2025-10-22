const DARK_MODE_KEY = 'enzo-site-dark-mode';

const prefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (theme) => {
    const body = document.body;
    if (!body) return;
    if (theme === 'dark') {
        body.dataset.theme = 'dark';
    } else {
        body.dataset.theme = 'light';
    }
};

const loadStoredTheme = () => {
    try {
        return localStorage.getItem(DARK_MODE_KEY);
    } catch (_error) {
        return null;
    }
};

const storeTheme = (theme) => {
    try {
        localStorage.setItem(DARK_MODE_KEY, theme);
    } catch (_error) {
        // ignored
    }
};

const initDarkModeToggle = () => {
    let theme = loadStoredTheme();
    if (!theme) {
        theme = prefersDark() ? 'dark' : 'light';
    }
    applyTheme(theme);

    const toggle = document.createElement('button');
    toggle.className = 'floating-toggle';
    toggle.type = 'button';
    toggle.textContent = theme === 'dark' ? 'light mode' : 'dark mode';
    toggle.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
        toggle.textContent = theme === 'dark' ? 'light mode' : 'dark mode';
        storeTheme(theme);
    });

    document.body.appendChild(toggle);
};

const initNavHighlight = () => {
    const links = Array.from(document.querySelectorAll('nav a[href]'));
    if (!links.length) return;
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    links.forEach((link) => {
        const linkPath = link.getAttribute('href');
        if (!linkPath) return;
        const normalized =
            linkPath === '/' ? '' : linkPath.replace(/\/+$/, '');
        if (currentPath.endsWith(normalized)) {
            link.classList.add('active');
        }
    });
};

const initTimeDisplay = () => {
    const timeEl = document.querySelector('[data-timezone]');
    if (!timeEl) return;

    const options = {
        timeZone: timeEl.dataset.timezone || 'Europe/Amsterdam',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };

    const formatter = new Intl.DateTimeFormat([], options);

    const update = () => {
        timeEl.textContent = formatter.format(new Date());
    };

    update();
    setInterval(update, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
    initDarkModeToggle();
    initNavHighlight();
    initTimeDisplay();
});
