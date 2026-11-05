import { getDatabase, createDatabaseConnection, closeDatabase, getDatabasePath } from './connection.js';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

export function initDatabase(options = {}) {
  const db = options.db || (options.dbPath ? createDatabaseConnection(options.dbPath) : getDatabase());
  const appliedMigrations = runMigrations(db);
  let seedResult = null;
  if (options.seed !== false) {
    seedResult = seedDatabase(db);
  }
  return {
    db,
    appliedMigrations,
    seedResult
  };
}

export {
  getDatabase,
  createDatabaseConnection,
  closeDatabase,
  getDatabasePath,
  runMigrations,
  seedDatabase
};
