<script lang="ts">
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';

    type Theme = 'light' | 'dark';

    const STORAGE_KEY = 'theme';
    const DARK_THEME_COLOR = '#343434';
    const LIGHT_THEME_COLOR = '#ffffff';

    let theme: Theme = 'light';
    let initialized = false;

    function applyTheme(next: Theme) {
        if (!browser) return;

        document.body.dataset.theme = next;
        document.documentElement.style.setProperty('color-scheme', next);
        localStorage.setItem(STORAGE_KEY, next);

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        const color = next === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
        if (metaTheme) {
            metaTheme.setAttribute('content', color);
        }
    }

    function toggleTheme() {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        theme = next;
        applyTheme(next);
    }

    onMount(() => {
        if (!browser) return;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
            theme = stored;
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        }

        applyTheme(theme);
        initialized = true;
    });

    $: nextTheme = theme === 'dark' ? 'light' : 'dark';
    $: currentLabel = nextTheme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode';
    $: nextThemeSwatch = nextTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
</script>

<button
    class="fixed bottom-6 right-6 rounded-full border px-4 py-2 transition-transform hover:scale-[1.05] focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
    style={`background-color: ${initialized ? nextThemeSwatch : 'var(--surface-bg)'}; border-color: var(--border-color);`}
    type="button"
    on:click={toggleTheme}
    aria-live="polite"
    aria-label={currentLabel}
>
</button>
