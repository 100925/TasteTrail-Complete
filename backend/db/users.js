import { hashPassword, verifyPassword } from '../auth/password.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role || 'user',
    bio: row.bio || '',
    avatar: row.avatar || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createUser(db, { email, password, displayName, role = 'user', bio = '' }) {
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new Error('A valid email address is required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const name = (displayName || '').trim();
  if (!name || name.length < 2) {
    throw new Error('Display name must be at least 2 characters long');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists');
  }

  const { hash, salt } = hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, salt, display_name, role, bio)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(normalizedEmail, hash, salt, name, role, bio ? bio.trim() : '');
  return findUserById(db, result.lastInsertRowid);
}

export function authenticateUser(db, email, password) {
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    return null;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return null;
  }

  return sanitizeUser(user);
}

export function findUserById(db, id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(numericId);
  return sanitizeUser(row);
}

export function findUserByEmail(db, email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  return sanitizeUser(row);
}

export function updateUserProfile(db, id, { displayName, bio, avatar }) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Invalid user ID');
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(numericId);
  if (!existing) {
    throw new Error('User not found');
  }

  const updates = [];
  const params = [];

  if (displayName !== undefined) {
    const name = String(displayName).trim();
    if (name.length < 2) {
      throw new Error('Display name must be at least 2 characters long');
    }
    updates.push('display_name = ?');
    params.push(name);
  }

  if (bio !== undefined) {
    updates.push('bio = ?');
    params.push(String(bio).trim());
  }

  if (avatar !== undefined) {
    updates.push('avatar = ?');
    params.push(String(avatar).trim());
  }

  if (updates.length === 0) {
    return findUserById(db, numericId);
  }

  updates.push("updated_at = datetime('now')");
  params.push(numericId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return findUserById(db, numericId);
}
