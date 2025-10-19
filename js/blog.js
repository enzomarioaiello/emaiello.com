const BLOG_STORAGE_KEY = 'enzo-blog-posts';

const DEFAULT_POSTS = [
  {
    id: 'boox',
    title: 'getting the most out of your boox tablet',
    format: 'html',
    content: `<p>I've been using my boox tablet for several years now, and given that the devices run android, have found myself keen on customizing them for optimized functionality. here's how I personally use my devices—</p>
<p>1. I've found myself searching for a new launcher on the device. one of the beauties of android is its ability to switch out the launcher—the main desktop environment that your device returns to after closing an app. while the default onyx launcher is perfectly usable, i'm not content with its lack of several "enthusiast" features, such as the ability to hide apps, add widgets, customize visual design, etc. having tested many launchers, i've been the happiest with unlauncher and aio launcher. unlauncher has worked well on my smaller devices, such as my nova air—while aio launcher has worked well on my larger boox note x.</p>
<p>2. adjusting note taking settings. while boox isn't particularly refined in ux, at least they offer users the ability to adjust many parts of the note taking experience. if you're writing on pdfs, i'd advise changing the page turn area so misclicks are reduced. this can be done in neoreader by clicking on the top right &gt; settings &gt; touch settings &gt; mode 6.</p>
<p>3. switching out the stock pen. i'm a bit of a snob when it comes to writing utensils. i've been pampered with high-end stationery for several years now, and often found myself fed up with the stock onyx pen. the plastic feels cheap, and it lacks an eraser. I generally reach for the tab s6 lite s-pen because it has a nice writing feel, is well built, and has a side eraser button.</p>
<p>here's a list of apps that I find myself using on my boox devices—</p>
<ul>
  <li>einkbro: great browser designed for e-ink</li>
  <li>pocket: great for saving articles for later reading</li>
  <li>anki: i enjoy studying japanese and reviewing decks on my boox devices</li>
  <li>syncthing: useful for automatically syncing files between devices</li>
  <li>tachiyomi: great manga reading app</li>
  <li>neoreader: my preferred reading app on boox tablets</li>
  <li>solid explorer: allows you to add folders as a shortcut on your homescreen</li>
</ul>`,
    createdAt: '2023-02-10T10:00:00.000Z',
    updatedAt: '2023-02-10T10:00:00.000Z'
  },
  {
    id: 'focus-notes',
    title: 'focus notes',
    format: 'markdown',
    content: `# focus notes

some quick ideas that keep me on track:

- keep your workspace uncluttered
- write down the next thing you'll do before you stop
- rest before you're exhausted

updated automatically whenever edits happen.`,
    createdAt: '2024-04-11T09:30:00.000Z',
    updatedAt: '2024-04-11T09:30:00.000Z'
  },
  {
    id: 'countdown',
    title: 'countdown habits',
    format: 'markdown',
    content: `## a simple countdown habit

I like to start my deep work sessions with a quick countdown:

1. tidy my desk
2. open the tools I need
3. set a goal for the next 50 minutes

it sounds basic, but it's a ritual that helps me cue the right mindset. I reference [[focus-notes]] whenever I need a reminder.`,
    createdAt: '2023-03-02T08:15:00.000Z',
    updatedAt: '2023-03-02T08:15:00.000Z'
  }
];

const markdownToHtml = (markdown) => {
  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formatInline = (text) =>
    text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  let inList = false;
  let inCode = false;
  let codeBuffer = [];

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  const closeCode = () => {
    if (inCode) {
      html += `<pre><code>${codeBuffer.join('\n')}</code></pre>`;
      inCode = false;
      codeBuffer = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      if (inCode) {
        closeCode();
      } else {
        closeList();
        inCode = true;
        codeBuffer = [];
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(escapeHtml(rawLine));
      return;
    }

    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        closeCode();
        html += '<ul>';
        inList = true;
      }
      const item = line.replace(/^\s*-\s+/, '');
      html += `<li>${formatInline(escapeHtml(item))}</li>`;
      return;
    }

    closeList();

    if (line.trim().length === 0) {
      html += '';
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = formatInline(escapeHtml(headingMatch[2].trim()));
      html += `<h${level}>${text}</h${level}>`;
      return;
    }

    html += `<p>${formatInline(escapeHtml(line))}</p>`;
  });

  closeList();
  closeCode();

  return html;
};

const linkifyReferences = (html) =>
  html.replace(/\[\[([a-zA-Z0-9_-]+)\]\]/g, (_match, id) => {
    const safeId = id.trim();
    return `<a href="#post-${safeId}" data-post-reference="${safeId}">[${safeId}]</a>`;
  });

const formatDateTime = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return value;
  }
};

const loadPosts = () => {
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_POSTS.map((post) => ({ ...post }));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_POSTS.map((post) => ({ ...post }));
    }
    return parsed.map((post) => ({
      ...post,
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt || new Date().toISOString(),
      format: post.format === 'html' ? 'html' : 'markdown'
    }));
  } catch (_error) {
    return DEFAULT_POSTS.map((post) => ({ ...post }));
  }
};

const savePosts = (posts) => {
  try {
    localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts));
  } catch (_error) {
    // storage might be unavailable, ignore silently
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggle-editor');
  const listView = document.getElementById('blog-list-view');
  const editorView = document.getElementById('blog-editor-view');
  const editorHeading = document.getElementById('editor-heading');
  const postForm = document.getElementById('post-form');
  const cancelEditButton = document.getElementById('cancel-edit');
  const postList = document.getElementById('post-list');
  const postTitleInput = document.getElementById('post-title-input');
  const postContentInput = document.getElementById('post-content-input');
  const detailTitle = document.getElementById('post-title');
  const detailContent = document.getElementById('post-content');
  const detailMeta = document.getElementById('post-meta');
  const detailActions = document.getElementById('detail-actions');
  const detailId = document.getElementById('post-id');
  const detailCreated = document.getElementById('post-created');
  const detailUpdated = document.getElementById('post-updated');
  const copyIdButton = document.getElementById('copy-id');
  const editPostButton = document.getElementById('edit-post');
  const deletePostButton = document.getElementById('delete-post');

  let posts = loadPosts();
  let selectedId = null;
  let editingId = null;

  const isEditorVisible = () => !editorView.classList.contains('hidden');

  const showEditor = (mode, post = null) => {
    editorHeading.textContent = mode === 'edit' ? 'edit post' : 'new post';
    postTitleInput.value = post ? post.title : '';
    postContentInput.value = post ? post.content : '';
    const targetFormat = post ? post.format : 'markdown';
    setFormatValue(targetFormat);
    editingId = post ? post.id : null;
    editorView.classList.remove('hidden');
    listView.classList.add('hidden');
    toggleButton.textContent = 'back to posts';
    postTitleInput.focus();
  };

  const showList = () => {
    editorView.classList.add('hidden');
    listView.classList.remove('hidden');
    toggleButton.textContent = 'new post';
    editingId = null;
  };

  const renderPostsList = () => {
    postList.innerHTML = '';
    if (!posts.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No posts yet. Create one to get started.';
      postList.appendChild(empty);
      return;
    }

    const sorted = [...posts].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    sorted.forEach((post) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <button type="button" class="post-select${
          post.id === selectedId ? ' selected' : ''
        }" data-action="select" data-id="${post.id}">
          ${post.title}
        </button>
        <div class="post-meta">
          <div class="post-meta-row">
            <span>id:</span>
            <span class="id-badge">${post.id}</span>
            <button type="button" data-action="copy" data-id="${post.id}">copy id</button>
          </div>
          <div class="muted">updated ${formatDateTime(post.updatedAt)}</div>
        </div>
        <div class="post-actions">
          <button type="button" data-action="edit" data-id="${post.id}">edit</button>
          <button type="button" data-action="delete" data-id="${post.id}">delete</button>
        </div>
      `;
      postList.appendChild(item);
    });
  };

  const renderDetail = () => {
    if (!selectedId) {
      detailTitle.textContent = 'Select a post';
      detailContent.innerHTML = '<p>Select a post from the list to read it here.</p>';
      detailMeta.classList.add('hidden');
      detailActions.classList.add('hidden');
      return;
    }

    const post = posts.find((item) => item.id === selectedId);
    if (!post) {
      detailTitle.textContent = 'Post not found';
      detailContent.innerHTML = '<p>The post you selected could not be found.</p>';
      detailMeta.classList.add('hidden');
      detailActions.classList.add('hidden');
      return;
    }

    detailTitle.textContent = post.title;
    detailId.textContent = post.id;
    detailCreated.textContent = `created ${formatDateTime(post.createdAt)}`;
    detailUpdated.textContent = `updated ${formatDateTime(post.updatedAt)}`;
    detailMeta.classList.remove('hidden');
    detailActions.classList.remove('hidden');

    let html =
      post.format === 'html' ? post.content : markdownToHtml(post.content || '');
    html = linkifyReferences(html);
    detailContent.innerHTML = html;
  };

  const selectPost = (id, updateHash = true) => {
    selectedId = id;
    renderPostsList();
    renderDetail();
    if (updateHash && id) {
      try {
        history.replaceState(null, '', `#post-${id}`);
      } catch (_error) {
        // ignore history errors
      }
    }
  };

  const ensureSelection = () => {
    if (selectedId && posts.some((post) => post.id === selectedId)) {
      return;
    }
    selectedId = posts.length ? posts[0].id : null;
  };

  const createPost = (title, content, format) => {
    const timestamp = new Date().toISOString();
    const id =
      (window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `post-${Date.now()}`);
    const post = {
      id,
      title,
      content,
      format,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    posts = [...posts, post];
    savePosts(posts);
    return post;
  };

  const updatePost = (id, changes) => {
    const timestamp = new Date().toISOString();
    posts = posts.map((post) =>
      post.id === id
        ? {
            ...post,
            ...changes,
            updatedAt: timestamp
          }
        : post
    );
    savePosts(posts);
    return posts.find((post) => post.id === id) || null;
  };

  const deletePost = (id) => {
    posts = posts.filter((post) => post.id !== id);
    savePosts(posts);
    ensureSelection();
    renderPostsList();
    renderDetail();
    try {
      if (selectedId) {
        history.replaceState(null, '', `#post-${selectedId}`);
      } else {
        history.replaceState(null, '', window.location.pathname);
      }
    } catch (_error) {
      // ignore history errors (e.g., file protocol)
    }
  };

  const handleCopy = (id) => {
    if (!id) return;
    const write = async () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = id;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    };
    write().catch(() => {
      // ignore copy errors
    });
  };

  toggleButton.addEventListener('click', () => {
    if (isEditorVisible()) {
      showList();
    } else {
      showEditor('create');
    }
  });

  cancelEditButton.addEventListener('click', () => {
    showList();
  });

  postForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = postTitleInput.value.trim();
    const content = postContentInput.value.trim();
    const format = getFormatValue();

    if (!title || !content) {
      return;
    }

    if (editingId) {
      const updated = updatePost(editingId, { title, content, format });
      if (updated) {
        selectPost(updated.id);
      }
    } else {
      const created = createPost(title, content, format);
      selectPost(created.id);
    }

    showList();
  });

  postList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    if (action === 'select') {
      selectPost(id);
    }

    if (action === 'copy') {
      handleCopy(id);
    }

    if (action === 'edit') {
      const post = posts.find((item) => item.id === id);
      if (post) {
        showEditor('edit', post);
      }
    }

    if (action === 'delete') {
      const confirmation =
        typeof window === 'undefined' ? true : window.confirm('Delete this post?');
      if (confirmation) {
        deletePost(id);
      }
    }
  });

  detailContent.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.postReference;
    if (!id) return;
    event.preventDefault();
    if (posts.some((post) => post.id === id)) {
      selectPost(id);
    }
  });

  copyIdButton.addEventListener('click', () => {
    if (selectedId) {
      handleCopy(selectedId);
    }
  });

  editPostButton.addEventListener('click', () => {
    if (!selectedId) return;
    const post = posts.find((item) => item.id === selectedId);
    if (post) {
      showEditor('edit', post);
    }
  });

  deletePostButton.addEventListener('click', () => {
    if (!selectedId) return;
    const post = posts.find((item) => item.id === selectedId);
    if (!post) return;
    const confirmation =
      typeof window === 'undefined' ? true : window.confirm('Delete this post?');
    if (confirmation) {
      deletePost(post.id);
    }
  });

  window.addEventListener('hashchange', () => {
    const match = window.location.hash.match(/^#post-(.+)$/);
    if (match && posts.some((post) => post.id === match[1])) {
      selectPost(match[1], false);
    }
  });

  ensureSelection();

  const initialHash = window.location.hash.match(/^#post-(.+)$/);
  if (initialHash && posts.some((post) => post.id === initialHash[1])) {
    selectedId = initialHash[1];
  }

  renderPostsList();
  renderDetail();
});
  const getFormatValue = () => {
    const field = postForm.elements.namedItem('format');
    if (!field) return 'markdown';
    if (typeof field.value === 'string') {
      return field.value === 'html' ? 'html' : 'markdown';
    }
    if (typeof field.length === 'number') {
      for (const input of Array.from(field)) {
        if (input instanceof HTMLInputElement && input.checked) {
          return input.value === 'html' ? 'html' : 'markdown';
        }
      }
    }
    if (field instanceof HTMLInputElement) {
      return field.value === 'html' ? 'html' : 'markdown';
    }
    return 'markdown';
  };

  const setFormatValue = (value) => {
    const normalized = value === 'html' ? 'html' : 'markdown';
    const field = postForm.elements.namedItem('format');
    if (!field) return;
    if (typeof field.value === 'string') {
      field.value = normalized;
    }
    if (typeof field.length === 'number') {
      Array.from(field).forEach((input) => {
        if (input instanceof HTMLInputElement && input.type === 'radio') {
          input.checked = input.value === normalized;
        }
      });
    } else if (field instanceof HTMLInputElement) {
      field.value = normalized;
    }
  };
