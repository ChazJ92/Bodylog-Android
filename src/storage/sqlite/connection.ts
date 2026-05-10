import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";
import { BODYLOG_SQLITE_SCHEMA } from "./schema";

/** Matches Dexie IndexedDB name; plugin stores as body-track SQLite DB. */
export const BODYLOG_DB_NAME = "body-track";

const sqliteConnection = new SQLiteConnection(CapacitorSQLite);

let initPromise: Promise<SQLiteDBConnection> | null = null;

async function doInit(): Promise<SQLiteDBConnection> {
  try {
    await sqliteConnection.checkConnectionsConsistency();
  } catch {
    /* stale JS-side map after reload */
  }

  const chk = await sqliteConnection.isConnection(BODYLOG_DB_NAME, false);
  let db: SQLiteDBConnection;
  if (chk.result) {
    db = await sqliteConnection.retrieveConnection(BODYLOG_DB_NAME, false);
  } else {
    db = await sqliteConnection.createConnection(BODYLOG_DB_NAME, false, "no-encryption", 1, false);
  }

  const openChk = await db.isDBOpen();
  if (!openChk.result) {
    await db.open();
  }

  await db.execute(BODYLOG_SQLITE_SCHEMA, true);
  return db;
}

export function getBodylogSqliteDb(): Promise<SQLiteDBConnection> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

export function clearBodylogSqliteInitPromise(): void {
  initPromise = null;
}

export async function closeBodylogSqliteConnection(): Promise<void> {
  const chk = await sqliteConnection.isConnection(BODYLOG_DB_NAME, false);
  if (!chk.result) return;
  try {
    const db = await sqliteConnection.retrieveConnection(BODYLOG_DB_NAME, false);
    const openChk = await db.isDBOpen();
    if (openChk.result) {
      await db.close();
    }
  } catch {
    /* ignore */
  }
  try {
    await sqliteConnection.closeConnection(BODYLOG_DB_NAME, false);
  } catch {
    /* ignore */
  }
  clearBodylogSqliteInitPromise();
}

export async function deleteBodylogSqliteDatabase(): Promise<void> {
  await closeBodylogSqliteConnection();
  try {
    await CapacitorSQLite.deleteDatabase({ database: BODYLOG_DB_NAME });
  } catch {
    /* idempotent */
  }
  clearBodylogSqliteInitPromise();
}
