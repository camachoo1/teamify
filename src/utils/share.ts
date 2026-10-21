/**
 * Encodes share data as URL-safe base64 of its UTF-8 JSON, so names
 * with any characters (accents, CJK, emoji) can be shared.
 *
 * @param data - Share payload to encode
 * @returns URL-safe base64 string without padding
 */
export const encodeShareData = (data: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(
    /[+/=]/g,
    (m) => ({ '+': '-', '/': '_', '=': '' }[m] || m)
  );
};

/**
 * Decodes data produced by encodeShareData. Links created before UTF-8
 * encoding stored Latin-1 text directly, so text that isn't valid UTF-8
 * is read as Latin-1 to keep those links working.
 *
 * @param encoded - URL-safe base64 string from a share link
 * @returns Parsed share payload
 * @throws If the string is not valid base64 or JSON
 */
export const decodeShareData = (encoded: string): unknown => {
  const normalized = encoded.replace(
    /[-_]/g,
    (m) => ({ '-': '+', _: '/' }[m] || m)
  );
  const padded =
    normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);

  let json: string;
  try {
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    json = binary;
  }
  return JSON.parse(json);
};

/**
 * Checks that a URL is a Challonge bracket embed, so share links can't
 * embed arbitrary sites.
 *
 * @param url - URL to check
 * @returns True for https URLs on challonge.com or its subdomains
 */
export const isChallongeUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === 'https:' &&
      (hostname === 'challonge.com' || hostname.endsWith('.challonge.com'))
    );
  } catch {
    return false;
  }
};
