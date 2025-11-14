<script lang="ts">
    import '../app.css';
    import { Toaster } from 'svelte-5-french-toast';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props()
</script>

<div class="max-w-[860px] mx-auto px-24 py-8">
    <Toaster />
    {@render children()}
    <ThemeToggle />
</div>
