// 편지 봉인(암호화). 브라우저가 편지를 잠가서 저장하고, 12/25에 서버만 풀 수 있다.
// - 잠그기: 편지마다 새 AES-GCM 열쇠로 내용을 잠그고, 그 열쇠를 아래 공개 열쇠(RSA-OAEP)로 다시 잠근다.
// - 풀기: 서버만 가진 비밀 열쇠(LETTER_PRIVATE_KEY, .env.local·Vercel에만 있다)로 연다.
// DB에는 "enc1.<잠긴 열쇠>.<iv>.<잠긴 내용>" 글자만 들어가서, DB나 Appwrite 키가 새도 편지는 읽을 수 없다.
// 브라우저와 Node 모두 기본으로 들어 있는 Web Crypto만 쓴다.

/** 공개 열쇠 (RSA-OAEP 3072, SPKI base64). 공개해도 되는 값이다 */
const PUBLIC_KEY = "MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAv2UE2VeeKfaOu8O+XeabISO8m3B22T5JA9CsRZlpYMA7KEXb5U/6xuPL6mIU/KgIRIp00o/8Cd3cTtdnWRkuWbiCBSIzfUjBGlUD+rcjBJ79korYnvMehBwq57dym3/h4F3fvL0DXq3ZGxgmbbikPa4rqXxiBynfmxz3kF1rvJoduBF9pq37UE1HYF23aaungOXhgzmpaAyAK+eLYZSmtwJXaYqO3GR5NfzMZlsr3S3VsdCq1oa/cVj0XpwoZOzQhz6pwZhGKUguGchztUInUC3+YDEejKsIr6SAkHAa9lwTYKln6Q4ohaEyDr79KAvXTMQJoPB9pcjBmb7G+icJ71I5WEEMcmYL3bY8yDRrnMKKV7g/TW+Ht4rUZ6yll72QqIoHTgkxDL2OD/EaeoLM3/kQIvrhgvZ6hdkRSaY9NtvJ/uDcyPCSEQAklyvCdT9+UY4HIGoMooVhP/pKWYa704o/TqnrZCbmH8QWR6nD3byymW+/fFFdNiYPQg5fxx1jAgMBAAE=";

const PREFIX = "enc1";
const RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const;

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 이미 봉인된 글인지 (예전에 그대로 저장된 편지와 구분한다) */
export function isSealed(text: string): boolean {
  return text.startsWith(`${PREFIX}.`);
}

/** 편지를 잠근다. 결과만 DB에 저장한다 */
export async function sealLetter(content: string): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const publicKey = await subtle.importKey("spki", fromBase64(PUBLIC_KEY), RSA, false, ["encrypt"]);
  const aes = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const body = await subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(content));
  const rawKey = await subtle.exportKey("raw", aes);
  const lockedKey = await subtle.encrypt(RSA, publicKey, rawKey);
  return [PREFIX, toBase64(lockedKey), toBase64(iv), toBase64(body)].join(".");
}

/**
 * 봉인을 푼다 (서버 전용: 비밀 열쇠가 필요하다).
 * 봉인되지 않은 예전 편지는 그대로 돌려준다.
 */
export async function openSeal(text: string, privateKeyBase64: string): Promise<string> {
  if (!isSealed(text)) return text;
  const [, lockedKey, iv, body] = text.split(".");
  if (!lockedKey || !iv || !body) throw new Error("봉인이 망가졌어요");
  const subtle = globalThis.crypto.subtle;
  const privateKey = await subtle.importKey("pkcs8", fromBase64(privateKeyBase64), RSA, false, ["decrypt"]);
  const rawKey = await subtle.decrypt(RSA, privateKey, fromBase64(lockedKey));
  const aes = await subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, aes, fromBase64(body));
  return new TextDecoder().decode(plain);
}
