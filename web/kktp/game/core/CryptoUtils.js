/**
 * CryptoUtils.js - Local crypto helpers for game modules
 */

export function hexToBytes(hex) {
  if (!hex) {
    return new Uint8Array();
  }
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const length = Math.floor(clean.length / 2);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    const byte = clean.slice(i * 2, i * 2 + 2);
    bytes[i] = Number.parseInt(byte, 16) || 0;
  }
  return bytes;
}

export function bytesToHex(bytes) {
  if (!bytes) {
    return "";
  }
  if (typeof bytes === "string") {
    return bytes.startsWith("0x") ? bytes.slice(2) : bytes;
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(data) {
  const input = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToHex(new Uint8Array(digest));
}

const CryptoUtils = { hexToBytes, bytesToHex, sha256 };

export default CryptoUtils;
