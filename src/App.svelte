<script>
  import { onMount } from 'svelte';
  import Home from './pages/Home.svelte';
  import About from './pages/About.svelte';
  import Faq from './pages/Faq.svelte';
  import Contact from './pages/Contact.svelte';
  import Blog from './pages/Blog.svelte';

  const routes = {
    '/': Home,
    '/about': About,
    '/faq': Faq,
    '/contact': Contact,
    '/blog': Blog
  };

  let route = '/';
  let blogSlug = null;

  const setRouteFromHash = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const hash = window.location.hash || '#/';
    const parts = hash.slice(1).split('/').filter(Boolean);

    if (parts.length === 0) {
      route = '/';
      blogSlug = null;
      return;
    }

    const [segment, maybeSlug] = parts;
    const base = `/${segment}`;

    if (base === '/blog' && maybeSlug) {
      route = '/blog';
      blogSlug = maybeSlug;
    } else if (routes[base]) {
      route = base;
      blogSlug = null;
    } else {
      route = '/';
      blogSlug = null;
    }
  };

  const navigate = (path) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (path === '/') {
      window.location.hash = '#/';
    } else {
      window.location.hash = `#${path}`;
    }
  };

  onMount(() => {
    setRouteFromHash();
    window.addEventListener('hashchange', setRouteFromHash);

    return () => {
      window.removeEventListener('hashchange', setRouteFromHash);
    };
  });
</script>

<main>
  <h1>Enzo Aiello</h1>

  <nav>
    <a
      href="#/"
      class:active={route === '/'}
      on:click|preventDefault={() => navigate('/')}
      >home</a
    >
    <a
      href="#/about"
      class:active={route === '/about'}
      on:click|preventDefault={() => navigate('/about')}
      >about</a
    >
    <a
      href="#/faq"
      class:active={route === '/faq'}
      on:click|preventDefault={() => navigate('/faq')}
      >faq</a
    >
    <a
      href="#/blog"
      class:active={route === '/blog'}
      on:click|preventDefault={() => navigate('/blog')}
      >blog</a
    >
    <a
      href="#/contact"
      class:active={route === '/contact'}
      on:click|preventDefault={() => navigate('/contact')}
      >contact</a
    >
  </nav>

  {#if routes[route]}
    {#if route === '/blog'}
      <svelte:component this={routes[route]} slug={blogSlug} on:navigate={navigate} />
    {:else}
      <svelte:component this={routes[route]} />
    {/if}
  {:else}
    <Home />
  {/if}
</main>
