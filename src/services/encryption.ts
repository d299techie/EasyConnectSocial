import * as Crypto from 'expo-crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 256;
const IV_LENGTH = 16;

async function getKeyMaterial(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(password.padEnd(32, '0').slice(0, 32));
  return await crypto.subtle.importKey('raw', keyData, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
}

async function generateKey(): Promise<string> {
  const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  const keyArray = Array.from(new Uint8Array(exported));
  return btoa(String.fromCharCode(...keyArray));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function encryptMessage(text: string, keyBase64: string): Promise<{ encrypted: string; iv: string }> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey('raw', keyBuffer, { name: ALGORITHM }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoder.encode(text));
  const encryptedArray = Array.from(new Uint8Array(encrypted));
  return { encrypted: btoa(String.fromCharCode(...encryptedArray)), iv: btoa(String.fromCharCode(...iv)) };
}

export async function decryptMessage(encryptedData: string, ivBase64: string, keyBase64: string): Promise<string> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey('raw', keyBuffer, { name: ALGORITHM }, false, ['decrypt']);
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encryptedBuffer);
  return new TextDecoder().decode(decrypted);
}

export async function generateChatKey(): Promise<string> {
  return await generateKey();
}

export async function generateUUID(): Promise<string> {
  return Crypto.randomUUID();
}
