import * as Crypto from 'expo-crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

export async function encryptMessage(text: string, keyBase64: string): Promise<{ encrypted: string; iv: string }> {
  const keyBytes = base64ToBytes(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(text);

  const ciphertext = new Uint8Array(data.length);
  const tag = new Uint8Array(16);

  for (let i = 0; i < data.length; i++) {
    ciphertext[i] = data[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
  }

  return {
    encrypted: bytesToBase64(concat(ciphertext, tag)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptMessage(encryptedData: string, ivBase64: string, keyBase64: string): Promise<string> {
  const keyBytes = base64ToBytes(keyBase64);
  const iv = base64ToBytes(ivBase64);
  const combined = base64ToBytes(encryptedData);
  const ciphertext = combined.slice(0, -16);

  const decrypted = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) {
    decrypted[i] = ciphertext[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
  }

  return new TextDecoder().decode(decrypted);
}

export async function generateChatKey(): Promise<string> {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(key);
}

export async function generateUUID(): Promise<string> {
  return Crypto.randomUUID();
}
