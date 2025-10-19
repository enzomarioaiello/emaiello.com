import { writable } from 'svelte/store';
import { defaultPosts } from '../data/defaultPosts';

const STORAGE_KEY = 'enzo-blog-posts';

const slugify = (value) =>
  value
    ?.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || '';

const normalizePosts = (posts) => {
  const timestamp = new Date().toISOString();
  return posts.map((post, index) => ({
    ...post,
    title: post.title ?? `post-${index + 1}`,
    id: post.id ?? `${index + 1}`,
    slug: slugify(post.slug) || slugify(post.title) || `${index + 1}`,
    published: post.published ?? false,
    createdAt: post.createdAt ?? timestamp,
    updatedAt: post.updatedAt ?? timestamp
  }));
};

const loadFromStorage = () => {
  if (typeof localStorage === 'undefined') {
    return normalizePosts(defaultPosts);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return normalizePosts(defaultPosts);
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return normalizePosts(defaultPosts);
    }

    return normalizePosts(parsed);
  } catch (error) {
    console.warn('Unable to read posts from storage, using defaults.', error);
    return normalizePosts(defaultPosts);
  }
};

const persist = (posts) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
};

const createPostsStore = () => {
  const initial = loadFromStorage();
  const { subscribe, update, set } = writable(initial);

  subscribe((value) => {
    persist(value);
  });

  return {
    subscribe,
    addPost(post) {
      const now = new Date().toISOString();
      update((posts) => {
        const slug = slugify(post.slug) || slugify(post.title) || `post-${Date.now()}`;
        const id = post.id?.toString() || `${Date.now()}`;
        const next = [
          ...posts,
          {
            id,
            slug,
            title: post.title?.trim() || 'untitled post',
            content: post.content?.trim() || '',
            published: Boolean(post.published),
            createdAt: now,
            updatedAt: now
          }
        ];
        return next;
      });
    },
    updatePost(id, changes) {
      const now = new Date().toISOString();
      update((posts) =>
        posts.map((post) => {
          if (post.id !== id) {
            return post;
          }

          const slugFromTitle = changes.title !== undefined ? slugify(changes.title) : undefined;

          return {
            ...post,
            ...changes,
            slug: slugify(changes.slug) || slugFromTitle || post.slug,
            title: changes.title?.trim() || post.title,
            content: changes.content?.trim() ?? post.content,
            published:
              typeof changes.published === 'boolean'
                ? changes.published
                : post.published,
            updatedAt: now
          };
        })
      );
    },
    deletePost(id) {
      update((posts) => posts.filter((post) => post.id !== id));
    },
    reset() {
      const normalized = normalizePosts(defaultPosts);
      set(normalized);
    }
  };
};

export const postsStore = createPostsStore();
