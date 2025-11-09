const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const POSTS_DIR = path.join(ROOT_DIR, 'posts');

if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8'
};

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const sendJson = (res, statusCode, data) => {
    setCorsHeaders(res);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data, null, 4));
};

const sendNoContent = (res) => {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
};

const readRequestBody = (req) =>
    new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 1e6) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });

const parseJsonBody = async (req) => {
    const rawBody = await readRequestBody(req);
    if (!rawBody) {
        return {};
    }
    try {
        return JSON.parse(rawBody);
    } catch (error) {
        throw new Error('Invalid JSON payload');
    }
};

const sanitizeId = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return null;
    }
    return trimmed;
};

const generateId = () => {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `post-${Date.now().toString(36)}`;
};

const getPostFilePath = (id) => path.join(POSTS_DIR, `${id}.json`);

const readPostFile = async (id) => {
    const filePath = getPostFilePath(id);
    const data = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(data);
};

const writePostFile = async (post) => {
    const filePath = getPostFilePath(post.id);
    await fsp.writeFile(filePath, `${JSON.stringify(post, null, 4)}\n`, 'utf8');
};

const deletePostFile = async (id) => {
    const filePath = getPostFilePath(id);
    await fsp.unlink(filePath);
};

const listPosts = async () => {
    const entries = await fsp.readdir(POSTS_DIR, { withFileTypes: true });
    const posts = [];
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
            const id = entry.name.replace(/\.json$/, '');
            try {
                const post = await readPostFile(id);
                posts.push(post);
            } catch (error) {
                console.warn(`Unable to read post ${entry.name}: ${error.message}`);
            }
        }
    }
    posts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return posts;
};

const handleApiRequest = async (req, res, url) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.statusCode = 204;
        res.end();
        return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/posts') {
        const posts = await listPosts();
        sendJson(res, 200, posts);
        return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/posts') {
        const payload = await parseJsonBody(req);
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const content = typeof payload.content === 'string' ? payload.content : '';
        const format = payload.format === 'html' ? 'html' : 'markdown';

        if (!title || !content) {
            sendJson(res, 400, { error: 'Title and content are required.' });
            return true;
        }

        const timestamp = new Date().toISOString();
        const post = {
            id: generateId(),
            title,
            content,
            format,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        await writePostFile(post);
        sendJson(res, 201, post);
        return true;
    }

    const match = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
    if (!match) {
        return false;
    }

    const id = sanitizeId(decodeURIComponent(match[1]));
    if (!id) {
        sendJson(res, 400, { error: 'Invalid post id.' });
        return true;
    }

    if (req.method === 'GET') {
        try {
            const post = await readPostFile(id);
            sendJson(res, 200, post);
        } catch (error) {
            if (error.code === 'ENOENT') {
                sendJson(res, 404, { error: 'Post not found.' });
            } else {
                throw error;
            }
        }
        return true;
    }

    if (req.method === 'PUT') {
        let existing;
        try {
            existing = await readPostFile(id);
        } catch (error) {
            if (error.code === 'ENOENT') {
                sendJson(res, 404, { error: 'Post not found.' });
                return true;
            }
            throw error;
        }

        const payload = await parseJsonBody(req);
        const title = typeof payload.title === 'string' ? payload.title.trim() : existing.title;
        const content = typeof payload.content === 'string' ? payload.content : existing.content;
        const format = payload.format === 'html' ? 'html' : existing.format;

        if (!title || !content) {
            sendJson(res, 400, { error: 'Title and content are required.' });
            return true;
        }

        const updated = {
            ...existing,
            title,
            content,
            format,
            updatedAt: new Date().toISOString()
        };

        await writePostFile(updated);
        sendJson(res, 200, updated);
        return true;
    }

    if (req.method === 'DELETE') {
        try {
            await deletePostFile(id);
            sendNoContent(res);
        } catch (error) {
            if (error.code === 'ENOENT') {
                sendJson(res, 404, { error: 'Post not found.' });
            } else {
                throw error;
            }
        }
        return true;
    }

    sendJson(res, 405, { error: 'Method not allowed.' });
    return true;
};

const serveStaticFile = async (res, pathname) => {
    try {
        let requestedPath = decodeURIComponent(pathname);
        if (requestedPath.startsWith('/')) {
            requestedPath = requestedPath.slice(1);
        }
        if (!requestedPath) {
            requestedPath = 'index.html';
        }

        requestedPath = path.normalize(requestedPath).replace(/^\.\//, '');
        if (requestedPath.includes('..')) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Forbidden');
            return;
        }

        let filePath = path.join(ROOT_DIR, requestedPath);
        let stats;
        try {
            stats = await fsp.stat(filePath);
            if (stats.isDirectory()) {
                filePath = path.join(filePath, 'index.html');
                stats = await fsp.stat(filePath);
            }
        } catch (error) {
            if (error.code === 'ENOENT' && !requestedPath.endsWith('.html')) {
                const fallbackPath = `${filePath}.html`;
                stats = await fsp.stat(fallbackPath);
                filePath = fallbackPath;
            } else {
                throw error;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const body = await fsp.readFile(filePath);
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Content-Length': body.length
        });
        res.end(body);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        console.error('Static file error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal server error');
    }
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        const handled = await handleApiRequest(req, res, url);
        if (handled) {
            return;
        }
        await serveStaticFile(res, url.pathname);
    } catch (error) {
        console.error('Request error:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Internal server error.' }));
        } else {
            res.end();
        }
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = server;
