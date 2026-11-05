import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = path.resolve(fileURLToPath(new URL('./migrations', import.meta.url)));

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = db.prepare('SELECT name FROM _migrations').all();
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied = [];

  for (const file of files) {
    if (!appliedSet.has(file)) {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');

      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec(sql);
        const insertStmt = db.prepare('INSERT INTO _migrations (name) VALUES (?)');
        insertStmt.run(file);
        db.exec('COMMIT;');
        newlyApplied.push(file);
      } catch (error) {
        db.exec('ROLLBACK;');
        throw new Error(`Failed to apply migration ${file}: ${error.message}`);
      }
    }
  }

  return newlyApplied;
}
