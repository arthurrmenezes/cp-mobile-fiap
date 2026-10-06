/**
 * Confere o token do Firebase sem o Admin SDK.
 *
 * O Worker roda num isolate do V8, não no Node: `firebase-admin` depende de
 * gRPC e de módulos nativos que não existem aqui. Mas o token do Firebase é um
 * JWT RS256 comum, e conferir um desses é só buscar a chave pública certa e
 * pedir para o WebCrypto validar a assinatura — que é o que este arquivo faz.
 *
 * A Google publica as chaves como JWKs num endereço fixo. Elas giram de tempos
 * em tempos, e o `Cache-Control` da resposta diz até quando valem: guardamos em
 * memória do isolate até esse prazo, para não buscar de novo a cada upload.
 */

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/** Tolerância de relógio: o celular da pessoa pode estar alguns segundos à frente. */
const CLOCK_SKEW_SECONDS = 60;

export class TokenError extends Error {}

export interface VerifiedToken {
  /** O uid do usuário — só de conta de verdade; sessão anônima é recusada. */
  uid: string;
  email?: string;
}

interface Jwk {
  kid: string;
  n: string;
  e: string;
  kty: string;
  alg: string;
}

let cachedKeys: Map<string, CryptoKey> | null = null;
let cachedUntil = 0;

/**
 * Valida o JWT e devolve quem ele diz ser.
 *
 * Confere, nesta ordem: o formato, a chave que assinou, a assinatura, o emissor
 * (`iss`), o destinatário (`aud`) e o prazo (`exp`/`iat`). Um token de outro
 * projeto do Firebase tem assinatura válida da Google e falharia só no `aud` —
 * por isso ele não é opcional.
 */
export async function verifyIdToken(token: string, projectId: string): Promise<VerifiedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new TokenError('Token malformado.');

  const [rawHeader, rawPayload, rawSignature] = parts;

  const header = decodeJson(rawHeader);
  if (header.alg !== 'RS256') throw new TokenError('Algoritmo inesperado.');
  if (typeof header.kid !== 'string') throw new TokenError('Token sem `kid`.');

  const keys = await publicKeys();
  const key = keys.get(header.kid);
  // Chave desconhecida costuma ser rodízio: as JWKs em memória ficaram velhas
  // antes do prazo que a resposta prometeu. Uma segunda busca resolve.
  const resolved = key ?? (await publicKeys(true)).get(header.kid);
  if (!resolved) throw new TokenError('Token assinado por uma chave desconhecida.');

  const signed = new TextEncoder().encode(`${rawHeader}.${rawPayload}`);
  const signature = base64UrlToBytes(rawSignature);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    resolved,
    signature as BufferSource,
    signed
  );
  if (!ok) throw new TokenError('Assinatura inválida.');

  const payload = decodeJson(rawPayload);
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new TokenError('Token de outro emissor.');
  }
  if (payload.aud !== projectId) throw new TokenError('Token de outro projeto.');
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new TokenError('Token sem dono.');
  }
  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < now) {
    throw new TokenError('Token vencido.');
  }
  if (typeof payload.iat !== 'number' || payload.iat - CLOCK_SKEW_SECONDS > now) {
    throw new TokenError('Token emitido no futuro.');
  }
  // As sessões anônimas do tempo do PIN continuam vivas nos aparelhos, com
  // token válido e renovado — e as regras do Firestore já não as aceitam.
  // Aqui também não: seriam contas de graça para encher o bucket.
  const firebase = payload.firebase as { sign_in_provider?: unknown } | undefined;
  if (firebase?.sign_in_provider === 'anonymous') {
    throw new TokenError('Sessão anônima não sobe foto nem avisa ninguém.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

async function publicKeys(force = false): Promise<Map<string, CryptoKey>> {
  if (!force && cachedKeys && Date.now() < cachedUntil) return cachedKeys;

  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new TokenError('Não deu para buscar as chaves do Firebase.');

  const { keys } = (await response.json()) as { keys: Jwk[] };
  const map = new Map<string, CryptoKey>();

  for (const jwk of keys) {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    map.set(jwk.kid, key);
  }

  cachedKeys = map;
  cachedUntil = Date.now() + maxAgeMs(response.headers.get('cache-control'));
  return map;
}

/** O prazo que a própria resposta declara, com um teto de uma hora. */
function maxAgeMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/);
  const seconds = match ? Number(match[1]) : 0;
  return Math.min(Math.max(seconds, 60), 3600) * 1000;
}

function decodeJson(segment: string): Record<string, unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
  } catch {
    throw new TokenError('Token ilegível.');
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
