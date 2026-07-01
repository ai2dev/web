/*
  crypto.js - Web Crypto API 기반 암호화/복호화 헬퍼 함수
  기능:
    1) 사용자 비밀번호와 salt 로 AES‑GCM 256‑bit 키 파생
    2) AES‑GCM 으로 문자열 암호화 (IV 12바이트 랜덤) → Base64 문자열 반환
    3) Base64 문자열 복호화 → 원본 문자열 반환
  비밀번호는 절대로 코드에 하드코딩하지 않으며, 호출 시 전달받는다.
*/

// 비밀번호와 salt 로 256‑bit AES‑GCM 키 파생
export async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  // raw 비밀번호를 PBKDF2 키 재료로 import
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // 충분히 많은 iteration 수와 SHA‑256 해시 사용
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 250000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// AES‑GCM 로 plainText 암호화 → Base64 문자열 반환
export async function encryptData(plainText, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96‑bit IV
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plainText)
  );

  // IV + Cipher 를 하나의 Uint8Array 로 합침
  const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.byteLength);

  // Base64 로 변환 (binary → string)
  const base64 = btoa(String.fromCharCode(...combined));
  return base64;
}

// Base64 로 인코딩된 암호문을 복호화 → 원본 문자열 반환
export async function decryptData(cipherBase64, key) {
  // Base64 → Uint8Array 변환
  const combined = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  return new TextDecoder().decode(plainBuf);
}
