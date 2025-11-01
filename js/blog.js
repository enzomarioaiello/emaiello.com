const API_BASE_URL = '/api/posts';

const requestJson = async (url, options = {}) => {
    const config = {
        ...options
    };
    config.headers = {
        ...(options.headers || {})
    };
    if (config.body && !config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
        response = await fetch(url, config);
    } catch (error) {
        throw new Error(`Network error: ${error.message}`);
    }

    if (!response.ok) {
        let message = '';
        try {
            message = await response.text();
        } catch (_error) {
            message = '';
        }
        throw new Error(message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    return null;
};

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

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-editor');
    const editorView = document.getElementById('blog-editor-view');
    const editorHeading = document.getElementById('editor-heading');
    const postForm = document.getElementById('post-form');
    const cancelEditButton = document.getElementById('cancel-edit');
    const postList = document.getElementById('post-list');
    const postTitleInput = document.getElementById('post-title-input');
    const postContentInput = document.getElementById('post-content-input');
    const formatRadios = postForm.elements.namedItem('format');
    const savePostButton = document.getElementById('save-post');
    const detailTitle = document.getElementById('post-title');
    const detailView = document.getElementById('post-detail');
    const detailContent = document.getElementById('post-content');
    const detailMeta = document.getElementById('post-meta');
    const detailActions = document.getElementById('detail-actions');
    const detailId = document.getElementById('post-id');
    const detailCreated = document.getElementById('post-created');
    const detailUpdated = document.getElementById('post-updated');
    const copyIdButton = document.getElementById('copy-id');
    const editPostButton = document.getElementById('edit-post');
    const deletePostButton = document.getElementById('delete-post');

    const state = {
        posts: [],
        selectedId: null,
        editingId: null,
        isLoading: true,
        loadError: null
    };

    const getFormatValue = () => {
        if (!formatRadios) {
            return 'markdown';
        }
        if (typeof formatRadios.length === 'number') {
            for (const input of Array.from(formatRadios)) {
                if (input instanceof HTMLInputElement && input.checked) {
                    return input.value === 'html' ? 'html' : 'markdown';
                }
            }
        }
        if (formatRadios instanceof HTMLInputElement) {
            return formatRadios.value === 'html' ? 'html' : 'markdown';
        }
        if (typeof formatRadios.value === 'string') {
            return formatRadios.value === 'html' ? 'html' : 'markdown';
        }
        return 'markdown';
    };

    const setFormatValue = (value) => {
        const normalized = value === 'html' ? 'html' : 'markdown';
        if (!formatRadios) {
            return;
        }
        if (typeof formatRadios.length === 'number') {
            Array.from(formatRadios).forEach((input) => {
                if (input instanceof HTMLInputElement && input.type === 'radio') {
                    input.checked = input.value === normalized;
                }
            });
            return;
        }
        if (formatRadios instanceof HTMLInputElement) {
            formatRadios.value = normalized;
            return;
        }
        if (typeof formatRadios.value === 'string') {
            formatRadios.value = normalized;
        }
    };

    const setSavingState = (isSaving) => {
        if (savePostButton) {
            savePostButton.disabled = isSaving;
        }
        toggleButton.disabled = isSaving;
    };

    const ensureSelection = () => {
        if (state.selectedId && state.posts.some((post) => post.id === state.selectedId)) {
            return;
        }
        state.selectedId = state.posts.length ? state.posts[0].id : null;
    };

    const renderPostsList = () => {
        postList.innerHTML = '';

        if (state.isLoading) {
            const item = document.createElement('li');
            item.textContent = 'Loading posts...';
            postList.appendChild(item);
            return;
        }

        if (state.loadError) {
            const item = document.createElement('li');
            item.textContent = state.loadError;
            postList.appendChild(item);
            return;
        }

        if (!state.posts.length) {
            const empty = document.createElement('li');
            empty.textContent = 'No posts yet. Create one to get started.';
            postList.appendChild(empty);
            return;
        }

        const sorted = [...state.posts].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        sorted.forEach((post) => {
            const item = document.createElement('li');
            item.innerHTML = `
                <button type="button" class="post-select${
                    post.id === state.selectedId ? ' selected' : ''
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
        if (state.isLoading) {
            detailTitle.textContent = 'Loading posts';
            detailContent.innerHTML = '<p>Loading...</p>';
            detailMeta.classList.add('hidden');
            detailActions.classList.add('hidden');
            return;
        }

        if (state.loadError) {
            detailTitle.textContent = 'no post selected';
            detailContent.innerHTML = ``;
            detailMeta.classList.add('hidden');
            detailActions.classList.add('hidden');
            return;
        }

        if (!state.selectedId) {
            detailTitle.textContent = 'Select a post';
            detailContent.innerHTML = '<p>Select a post from the list to read it here.</p>';
            detailMeta.classList.add('hidden');
            detailActions.classList.add('hidden');
            return;
        }

        const post = state.posts.find((item) => item.id === state.selectedId);
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

        let html = post.format === 'html' ? post.content : markdownToHtml(post.content || '');
        html = linkifyReferences(html);
        detailContent.innerHTML = html;
    };

    const selectPost = (id, updateHash = true) => {
        state.selectedId = id;
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

    const applyHashSelection = () => {
        const match = window.location.hash.match(/^#post-(.+)$/);
        if (match && state.posts.some((post) => post.id === match[1])) {
            state.selectedId = match[1];
        } else {
            ensureSelection();
        }
    };

    const showEditor = (mode, post = null) => {
        editorHeading.textContent = mode === 'edit' ? 'edit post' : 'new post';
        postTitleInput.value = post ? post.title : '';
        postContentInput.value = post ? post.content : '';
        setFormatValue(post ? post.format : 'markdown');
        state.editingId = post ? post.id : null;
        detailView.classList.add('hidden');
        editorView.classList.remove('hidden');
        toggleButton.textContent = 'back to posts';
        postTitleInput.focus();
    };

    const showList = () => {
        detailView.classList.remove('hidden');
        editorView.classList.add('hidden');
        toggleButton.textContent = 'new post';
        state.editingId = null;
        postTitleInput.value = '';
        postContentInput.value = '';
        setFormatValue('markdown');
    };

    const fetchPosts = async () => {
        state.isLoading = true;
        state.loadError = null;
        renderPostsList();
        renderDetail();

        try {
            const data = await requestJson(API_BASE_URL, {
                method: 'GET'
            });
            state.posts = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to load posts', error);
            state.posts = [];
            // state.loadError = 'Unable to load posts.';
        }

        state.isLoading = false;
        applyHashSelection();
        renderPostsList();
        renderDetail();
    };

    const createPost = async (title, content, format) => {
        const payload = {
            title,
            content,
            format
        };
        const created = await requestJson(API_BASE_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (created) {
            state.posts = [...state.posts, created];
        }
        return created;
    };

    const updatePost = async (id, changes) => {
        const updated = await requestJson(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(changes)
        });
        if (updated) {
            state.posts = state.posts.map((post) => (post.id === id ? updated : post));
        }
        return updated;
    };

    const removePost = async (id) => {
        await requestJson(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        state.posts = state.posts.filter((post) => post.id !== id);
        ensureSelection();
        renderPostsList();
        renderDetail();
        try {
            if (state.selectedId) {
                history.replaceState(null, '', `#post-${state.selectedId}`);
            } else {
                history.replaceState(null, '', window.location.pathname);
            }
        } catch (_error) {
            // ignore history errors
        }
    };

    const handleCopy = (id) => {
        if (!id) {
            return;
        }
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
        if (!editorView.classList.contains('hidden')) {
            showList();
        } else {
            showEditor('create');
        }
    });

    cancelEditButton.addEventListener('click', () => {
        showList();
    });

    postForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = postTitleInput.value.trim();
        const content = postContentInput.value.trim();
        const format = getFormatValue();

        if (!title || !content) {
            return;
        }

        try {
            setSavingState(true);
            let post;
            if (state.editingId) {
                post = await updatePost(state.editingId, { title, content, format });
            } else {
                post = await createPost(title, content, format);
            }
            if (post) {
                showList();
                selectPost(post.id);
            }
        } catch (error) {
            console.error('Failed to save post', error);
            window.alert('Could not save the post. Please try again.');
        } finally {
            setSavingState(false);
        }
    });

    postList.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) {
            return;
        }

        if (action === 'select') {
            selectPost(id);
            return;
        }

        if (action === 'copy') {
            handleCopy(id);
            return;
        }

        if (action === 'edit') {
            const post = state.posts.find((item) => item.id === id);
            if (post) {
                showEditor('edit', post);
            }
            return;
        }

        if (action === 'delete') {
            const confirmation =
                typeof window === 'undefined' ? true : window.confirm('Delete this post?');
            if (!confirmation) {
                return;
            }
            try {
                if (deletePostButton) {
                    deletePostButton.disabled = true;
                }
                await removePost(id);
            } catch (error) {
                console.error('Failed to delete post', error);
                window.alert('Could not delete the post. Please try again.');
            } finally {
                if (deletePostButton) {
                    deletePostButton.disabled = false;
                }
            }
        }
    });

    detailContent.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const id = target.dataset.postReference;
        if (!id) {
            return;
        }
        event.preventDefault();
        if (state.posts.some((post) => post.id === id)) {
            selectPost(id);
        }
    });

    copyIdButton.addEventListener('click', () => {
        if (state.selectedId) {
            handleCopy(state.selectedId);
        }
    });

    editPostButton.addEventListener('click', () => {
        if (!state.selectedId) {
            return;
        }
        const post = state.posts.find((item) => item.id === state.selectedId);
        if (post) {
            showEditor('edit', post);
        }
    });

    deletePostButton.addEventListener('click', async () => {
        if (!state.selectedId) {
            return;
        }
        const confirmation =
            typeof window === 'undefined' ? true : window.confirm('Delete this post?');
        if (!confirmation) {
            return;
        }
        try {
            deletePostButton.disabled = true;
            await removePost(state.selectedId);
        } catch (error) {
            console.error('Failed to delete post', error);
            window.alert('Could not delete the post. Please try again.');
        } finally {
            deletePostButton.disabled = false;
        }
    });

    window.addEventListener('hashchange', () => {
        const match = window.location.hash.match(/^#post-(.+)$/);
        if (match && state.posts.some((post) => post.id === match[1])) {
            selectPost(match[1], false);
        }
    });

    renderPostsList();
    renderDetail();
    fetchPosts();
});
