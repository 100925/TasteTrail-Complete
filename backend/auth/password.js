import crypto from 'node:crypto';

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, storedHash, salt) {
  if (typeof password !== 'string' || !storedHash || !salt) {
    return false;
  }
  const key = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key);
  const hashBuffer = Buffer.from(storedHash, 'hex');

  if (keyBuffer.length !== hashBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, hashBuffer);
}
