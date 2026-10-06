import { TokenError, verifyIdToken } from './verifyIdToken';

export interface Env {
  PHOTOS: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
}

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;

    if (request.method === 'OPTIONS') return preflight(request, env);
    if (request.method === 'POST' && path === '/upload') return upload(request, env);
    if (request.method === 'GET' && path.startsWith('/p/')) {
      return serve(decodeURIComponent(path.slice(3)), env);
    }
    if (request.method === 'GET' && path === '/health') {
      return new Response('ok');
    }

    return new Response('Não encontrado', { status: 404 });
  },
};

async function upload(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'), env);
  if (!cors) return json({ error: 'Origem não autorizada' }, 403, {});

  const token = bearer(request.headers.get('authorization'));
  if (!token) return json({ error: 'Faltou o token' }, 401, cors);

  let uid: string;
  try {
    ({ uid } = await verifyIdToken(token, env.FIREBASE_PROJECT_ID));
  } catch (error) {
    const message = error instanceof TokenError ? error.message : 'Token recusado';
    return json({ error: message }, 401, cors);
  }

  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim();
  const extension = ALLOWED_TYPES[type];
  if (!extension) return json({ error: 'Formato de imagem não aceito' }, 415, cors);

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'Corpo vazio' }, 400, cors);
  if (body.byteLength > MAX_BYTES) return json({ error: 'Foto grande demais' }, 413, cors);

  const key = `${uid}/${crypto.randomUUID()}.${extension}`;

  await env.PHOTOS.put(key, body, {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  return json({ url: photoUrl(key, request) }, 200, cors);
}

async function serve(key: string, env: Env): Promise<Response> {
  if (!key || key.includes('..')) return new Response('Não encontrado', { status: 404 });

  const object = await env.PHOTOS.get(key);
  if (!object) return new Response('Não encontrado', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}

function preflight(request: Request, env: Env): Response {
  const cors = corsHeaders(request.headers.get('origin'), env);
  if (!cors) return new Response(null, { status: 403 });

  return new Response(null, {
    status: 204,
    headers: {
      ...cors,
      'access-control-allow-methods': 'POST, GET, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
    },
  });
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> | null {
  // Apps nativos (React Native) não enviam cabeçalho "origin" — só navegadores
  // enviam. Sem origin, deixamos passar; CORS só importa para o navegador.
  if (!origin) return {};

  const allowed = env.ALLOWED_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowed.includes('*')) return { 'access-control-allow-origin': '*' };
  if (!allowed.includes(origin)) return null;

  return { 'access-control-allow-origin': origin, vary: 'Origin' };
}

function bearer(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

function photoUrl(key: string, request: Request): string {
  return `${new URL(request.url).origin}/p/${key}`;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
