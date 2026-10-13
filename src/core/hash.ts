/**
 * Deterministic serialisation and hashing for state comparison (soak,
 * determinism tests, __EP__.hash()).
 */

/** JSON with object keys sorted, so equal data always gives the same text. Rejects non-JSON values. */
export function stableStringify(value: unknown): string {
  return write(value, '$');
}

function write(v: unknown, path: string): string {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'number':
      if (!Number.isFinite(v)) throw new TypeError(`non-finite number at ${path}`);
      return JSON.stringify(v);
    case 'string':
    case 'boolean':
      return JSON.stringify(v);
    case 'object': {
      if (Array.isArray(v)) return `[${v.map((x, i) => write(x, `${path}[${i}]`)).join(',')}]`;
      const proto = Object.getPrototypeOf(v) as unknown;
      if (proto !== Object.prototype && proto !== null) throw new TypeError(`non-plain object at ${path}`);
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const parts: string[] = [];
      for (const k of keys) {
        const x = obj[k];
        if (x === undefined) throw new TypeError(`undefined at ${path}.${k}`);
        parts.push(`${JSON.stringify(k)}:${write(x, `${path}.${k}`)}`);
      }
      return `{${parts.join(',')}}`;
    }
    default:
      throw new TypeError(`non-JSON ${typeof v} at ${path}`);
  }
}

/** 64-bit FNV-1a (two 32-bit lanes) over a string, as 16 hex chars. */
export function hashString(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Hash of any JSON-safe value (normally a SimState). */
export function hashState(value: unknown): string {
  return hashString(stableStringify(value));
}

/** Paths of every NaN, Infinity, undefined or non-plain value (soak invariant). Empty means clean. */
export function findNonJson(value: unknown, path = '$', out: string[] = [], limit = 20): string[] {
  if (out.length >= limit) return out;
  if (value === null) return out;
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return out;
    case 'number':
      if (!Number.isFinite(value)) out.push(path);
      return out;
    case 'object': {
      if (Array.isArray(value)) {
        value.forEach((x, i) => findNonJson(x, `${path}[${i}]`, out, limit));
        return out;
      }
      const proto = Object.getPrototypeOf(value) as unknown;
      if (proto !== Object.prototype && proto !== null) {
        out.push(path);
        return out;
      }
      for (const [k, x] of Object.entries(value as Record<string, unknown>)) findNonJson(x, `${path}.${k}`, out, limit);
      return out;
    }
    default:
      out.push(path);
      return out;
  }
}
