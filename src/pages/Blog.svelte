<script>
  import { onDestroy } from 'svelte';
  import { postsStore } from '../lib/stores/postsStore';

  export let slug = null;
  export let navigate = () => {};

  let posts = [];
  let selectedId = null;
  let selectedPost = null;
  let showForm = false;
  let editingId = null;
  let formData = {
    title: '',
    slug: '',
    content: '',
    published: true
  };
  let formError = '';

  const unsubscribe = postsStore.subscribe((value) => {
    posts = [...value].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });
  });

  onDestroy(() => {
    unsubscribe();
  });

  $: if (posts.length) {
    if (slug) {
      const match = posts.find((post) => post.slug === slug);
      if (match && match.id !== selectedId) {
        selectedId = match.id;
      }
    } else if (!selectedId) {
      selectedId = posts[0].id;
    }
  }

  $: selectedPost = posts.find((post) => post.id === selectedId) ?? null;

  $: if (selectedPost && slug !== selectedPost.slug) {
    navigate(`/blog/${selectedPost.slug}`);
  }

  const startCreate = () => {
    showForm = true;
    editingId = null;
    formError = '';
    formData = {
      title: '',
      slug: '',
      content: '',
      published: true
    };
  };

  const startEdit = (post) => {
    showForm = true;
    editingId = post.id;
    formError = '';
    formData = {
      title: post.title,
      slug: post.slug,
      content: post.content,
      published: post.published
    };
  };

  const cancelForm = () => {
    showForm = false;
    editingId = null;
    formData = {
      title: '',
      slug: '',
      content: '',
      published: true
    };
    formError = '';
  };

  const submitForm = () => {
    if (!formData.title.trim()) {
      formError = 'Title is required';
      return;
    }

    if (editingId) {
      postsStore.updatePost(editingId, { ...formData });
      showForm = false;
      editingId = null;
    } else {
      const newId = `${Date.now()}`;
      const slugValue =
        slugify(formData.slug) || slugify(formData.title) || `post-${newId}`;
      postsStore.addPost({ ...formData, id: newId, slug: slugValue });
      selectedId = newId;
      navigate(`/blog/${slugValue}`);
      showForm = false;
    }

    formError = '';
  };

  const slugify = (value) =>
    value
      ?.toString()
      ?.toLowerCase()
      ?.replace(/[^a-z0-9]+/g, '-')
      ?.replace(/(^-|-$)+/g, '') || '';

  const openPost = (post) => {
    selectedId = post.id;
    navigate(`/blog/${post.slug}`);
  };

  const togglePublish = (post) => {
    postsStore.updatePost(post.id, { published: !post.published });
  };

  const deletePost = (post) => {
    if (typeof window === 'undefined' || window.confirm('Delete this post?')) {
      const deletingCurrent = selectedId === post.id;
      postsStore.deletePost(post.id);
      if (deletingCurrent) {
        selectedId = null;
        navigate('/blog');
      }
    }
  };

  const resetPosts = () => {
    if (typeof window === 'undefined' || window.confirm('Reset posts to defaults?')) {
      postsStore.reset();
      selectedId = null;
      navigate('/blog');
    }
  };
</script>

<section class="blog">
  <div class="blog-controls">
    <button on:click={startCreate}>new post</button>
    <button on:click={resetPosts}>reset to defaults</button>
  </div>

  <div class="blog-layout">
    <aside>
      <h2>posts</h2>
      {#if posts.length === 0}
        <p>No posts yet.</p>
      {:else}
        <ul>
          {#each posts as post}
            <li>
              <button
                class:selected={post.id === selectedId}
                on:click={() => openPost(post)}
              >
                {post.title}
                {#if !post.published}
                  <span aria-label="draft"> (draft)</span>
                {/if}
              </button>
              <div class="post-actions">
                <button on:click={() => startEdit(post)}>edit</button>
                <button on:click={() => togglePublish(post)}>
                  {post.published ? 'unpublish' : 'publish'}
                </button>
                <button on:click={() => deletePost(post)}>delete</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </aside>

    <article>
      {#if selectedPost}
        <h2>{selectedPost.title}</h2>
        <p>
          <small>
            updated {new Date(selectedPost.updatedAt).toLocaleString()}
            {#if !selectedPost.published}
              — draft
            {/if}
          </small>
        </p>
        <div class="post-content">
          {@html selectedPost.content}
        </div>
      {:else}
        <p>Select or create a post to get started.</p>
      {/if}
    </article>
  </div>

  {#if showForm}
    <div class="editor">
      <h2>{editingId ? 'edit post' : 'new post'}</h2>
      {#if formError}
        <p class="error">{formError}</p>
      {/if}
      <form on:submit|preventDefault={submitForm}>
        <label>
          title
          <input bind:value={formData.title} placeholder="Title" />
        </label>
        <label>
          slug
          <input bind:value={formData.slug} placeholder="Optional custom slug" />
        </label>
        <label>
          content
          <textarea bind:value={formData.content} placeholder="Write your post content here..."></textarea>
        </label>
        <label class="checkbox">
          <input type="checkbox" bind:checked={formData.published} />
          published
        </label>
        <div class="editor-actions">
          <button type="submit">save</button>
          <button type="button" on:click={cancelForm}>cancel</button>
        </div>
      </form>
    </div>
  {/if}
</section>

<style>
  .blog-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .blog-layout {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }

  aside {
    flex: 1 1 240px;
  }

  aside ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  aside li {
    border: 1px solid #000;
    padding: 0.5rem;
  }

  aside button {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }

  aside button.selected {
    text-decoration: underline;
  }

  .post-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  article {
    flex: 2 1 320px;
  }

  .post-content :global(p) {
    line-height: 1.5;
  }

  .editor {
    margin-top: 2rem;
    border-top: 1px solid #000;
    padding-top: 2rem;
  }

  .editor-actions {
    display: flex;
    gap: 1rem;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .error {
    color: #c00;
  }
</style>
