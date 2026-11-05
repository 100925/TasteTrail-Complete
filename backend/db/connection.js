import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

export function getDatabasePath() {
  const envPath = process.env.DATABASE_PATH;
  if (!envPath) {
    return path.join(rootDir, 'backend', 'data', 'tastetrail.db');
  }
  if (envPath === ':memory:') {
    return ':memory:';
  }
  return path.isAbsolute(envPath) ? envPath : path.resolve(rootDir, envPath);
}

export function createDatabaseConnection(dbPath = getDatabasePath()) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  return db;
}

let defaultDb = null;

export function getDatabase() {
  if (!defaultDb) {
    defaultDb = createDatabaseConnection();
  }
  return defaultDb;
}

export function closeDatabase() {
  if (defaultDb) {
    try {
      defaultDb.close();
    } catch {
      // Ignore if already closed
    }
    defaultDb = null;
  }
}
