<script lang="ts">
    import { resolve } from '$app/paths';
    import home from '$lib/images/home.jpg';

    const homeImageAlt = "The Artist's Garden At Eragny by Camille Pissarro"
</script>

<div class="">
    <header>
        <h1>Enzo Aiello</h1>
        <nav>
            <a href={resolve("/")}>home</a>
            <a href={resolve("/about")}>about</a>
            <a href={resolve("/faq")}>faq</a>
            <a href={resolve("/blog")}>blog</a>
            <a href={resolve("/contact")}>contact</a>
        </nav>
    </header>

    <main>
        <section class="my-4 text-center">
            <p>
                <img
                    src={home}
                    alt="Beautiful"
                    class="rounded-2xl"
                />
            </p>
            <p class="py-2">
                <em>
                    {homeImageAlt}
                </em>
            </p>
        </section>
    </main>
</div>
