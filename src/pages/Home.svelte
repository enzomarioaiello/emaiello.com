<script>
  import { onDestroy, onMount } from 'svelte';

  const timezone = 'Europe/Amsterdam';
  const formatter = new Intl.DateTimeFormat([], {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  let now = new Date();
  let timer;

  const update = () => {
    now = new Date();
  };

  onMount(() => {
    timer = setInterval(update, 1000);
  });

  onDestroy(() => {
    clearInterval(timer);
  });

  $: currentTime = formatter.format(now);
</script>

<section style="text-align: center;">
  <p>
    <img src="https://i.imgur.com/zy8BRWw.png" alt="Enzo Aiello" style="width: 100%; max-width: 560px;" />
  </p>

  <p>
    <em>
      time in my part of the world — {currentTime}
    </em>
  </p>
</section>
