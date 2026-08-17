/** Truy vấn CSDL. Tách riêng khỏi route để route chỉ lo HTTP, không lo SQL. */

import { hashPassword, verifyPassword, issueSessionToken, hashSessionToken, encryptJson, decryptJson } from './crypto.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export function createStore(db) {
  return {
    createUser(email, password) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        const err = new Error('Email đã được đăng ký.');
        err.status = 409;
        throw err;
      }
      const { hash, salt } = hashPassword(password);
      const now = new Date().toISOString();
      const result = db
        .prepare(
          'INSERT INTO users (email, password_hash, password_salt, consent_at, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(email, hash, salt, now, now);
      return Number(result.lastInsertRowid);
    },

    verifyLogin(email, password) {
      const user = db.prepare('SELECT id, password_hash, password_salt FROM users WHERE email = ?').get(email);
      if (!user) return null;
      if (!verifyPassword(password, user.password_salt, user.password_hash)) return null;
      return Number(user.id);
    },

    createSession(userId) {
      const { token, tokenHash } = issueSessionToken();
      const now = new Date();
      const expires = new Date(now.getTime() + SESSION_TTL_MS);
      db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
        tokenHash,
        userId,
        now.toISOString(),
        expires.toISOString(),
      );
      return token;
    },

    userIdForToken(token) {
      const tokenHash = hashSessionToken(token);
      const row = db
        .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
        .get(tokenHash);
      if (!row) return null;
      if (new Date(row.expires_at).getTime() < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
        return null;
      }
      return Number(row.user_id);
    },

    deleteSession(token) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
    },

    saveProfile(userId, profile) {
      const { ciphertext, iv, authTag } = encryptJson(profile);
      db.prepare(
        `INSERT INTO profiles (user_id, ciphertext, iv, auth_tag, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET ciphertext = excluded.ciphertext, iv = excluded.iv,
           auth_tag = excluded.auth_tag, updated_at = excluded.updated_at`,
      ).run(userId, ciphertext, iv, authTag, new Date().toISOString());
    },

    loadProfile(userId) {
      const row = db
        .prepare('SELECT ciphertext, iv, auth_tag AS authTag FROM profiles WHERE user_id = ?')
        .get(userId);
      if (!row) return null;
      return decryptJson(row);
    },

    /** Xoá toàn bộ dữ liệu của một người dùng — quyền yêu cầu xoá theo Nghị định 13/2023/NĐ-CP. */
    deleteAccount(userId) {
      db.prepare('DELETE FROM profiles WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    },
  };
}
