<script lang="ts">
    import home from '$lib/images/home.jpg';

    const homeImageDesc = "The Artist's Garden At Eragny by Camille Pissarro"
</script>

<div class="">
    <main>
        <section class="text-center">
            <p>
                <img
                    src={home}
                    alt="Beautiful"
                    class="rounded-xl"
                />
            </p>
            <p class="py-2 text-xs">
                <em>
                    {homeImageDesc}
                </em>
            </p>
        </section>
    </main>
</div>
