/**
 * Băm mật khẩu, mã hoá hồ sơ tài chính khi lưu, và token phiên đăng nhập.
 * Chỉ dùng node:crypto — không kéo thêm thư viện nào.
 *
 * Nghị định 13/2023/NĐ-CP yêu cầu mã hoá dữ liệu cá nhân khi lưu trữ (xem
 * mục 8.1.1 của bản kế hoạch). Hồ sơ tài chính được mã hoá bằng AES-256-GCM
 * trước khi ghi xuống CSDL; khoá nằm ngoài mã nguồn, lấy từ biến môi trường.
 */

import { randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const AES_ALGO = 'aes-256-gcm';

function encryptionKey() {
  const fromEnv = process.env.DECIFIN_ENC_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, 'hex');
    if (key.length !== 32) {
      throw new Error('DECIFIN_ENC_KEY phải là 32 byte dạng hex (64 ký tự).');
    }
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu DECIFIN_ENC_KEY. Không được chạy production mà không đặt khoá mã hoá.');
  }
  // Khoá cố định chỉ dùng khi phát triển cục bộ, không dùng để lưu dữ liệu thật.
  return createHash('sha256').update('decifin-dev-only-key-do-not-use-in-prod').digest();
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function issueSessionToken() {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function encryptJson(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGO, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptJson({ ciphertext, iv, authTag }) {
  const decipher = createDecipheriv(AES_ALGO, encryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}
