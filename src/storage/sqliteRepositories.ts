import { ensureBuiltInMeasurementTypes } from "@/db/builtIns";
import type {
  AppMeta,
  Checkin,
  Measurement,
  MeasurementType,
  Photo,
  PoseTag,
  Profile,
  Settings,
} from "@/db/db";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { AppRepositories } from "./repositories";
import { deleteBodylogSqliteDatabase, getBodylogSqliteDb } from "./sqlite/connection";
import { notifyStorageMutation } from "./storageRevision";

let inSqlTxn = 0;

async function runWrite(
  db: SQLiteDBConnection,
  sql: string,
  values?: unknown[],
): Promise<void> {
  const inner = inSqlTxn > 0;
  await db.run(sql, values ?? [], !inner);
}

async function runWriteNotify(
  db: SQLiteDBConnection,
  sql: string,
  values?: unknown[],
): Promise<void> {
  await runWrite(db, sql, values);
  if (inSqlTxn === 0) notifyStorageMutation();
}

async function withTxn<T>(db: SQLiteDBConnection, fn: () => Promise<T>): Promise<T> {
  inSqlTxn++;
  await db.beginTransaction();
  try {
    const r = await fn();
    await db.commitTransaction();
    return r;
  } catch (e) {
    await db.rollbackTransaction();
    throw e;
  } finally {
    inSqlTxn--;
    if (inSqlTxn === 0) notifyStorageMutation();
  }
}

async function queryRows<T extends Record<string, unknown>>(
  db: SQLiteDBConnection,
  sql: string,
  values?: unknown[],
): Promise<T[]> {
  const res = await db.query(sql, values ?? []);
  return (res.values ?? []) as T[];
}

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  return Number(v);
}

function strOrUndef(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return s.length ? s : undefined;
}

function blobFromSql(val: unknown, mimeType: string): Blob {
  if (val instanceof Blob) return val;
  if (val instanceof ArrayBuffer) return new Blob([val], { type: mimeType });
  if (val instanceof Uint8Array) return new Blob([val], { type: mimeType });
  if (Array.isArray(val)) return new Blob([new Uint8Array(val as number[])], { type: mimeType });
  return new Blob([], { type: mimeType });
}

function rowProfile(r: Record<string, unknown>): Profile {
  return {
    id: "primary",
    sex: r.sex as Profile["sex"],
    heightCm: numOrUndef(r.heightCm),
    birthYear: numOrUndef(r.birthYear) as number | undefined,
    updatedAt: Number(r.updatedAt),
  };
}

function rowSettings(r: Record<string, unknown>): Settings {
  return {
    id: "local",
    weightUnit: r.weightUnit as Settings["weightUnit"],
    lengthUnit: r.lengthUnit as Settings["lengthUnit"],
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt),
  };
}

function rowAppMeta(r: Record<string, unknown>): AppMeta {
  return {
    id: "meta",
    schemaVersion: Number(r.schemaVersion),
  };
}

function rowCheckin(r: Record<string, unknown>): Checkin {
  return {
    id: String(r.id),
    recordedAt: Number(r.recordedAt),
    dateKey: String(r.dateKey),
    weightKg: numOrUndef(r.weightKg),
    bodyFatPct: numOrUndef(r.bodyFatPct),
    notes: strOrUndef(r.notes),
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt),
  };
}

function rowMeasurementType(r: Record<string, unknown>): MeasurementType {
  return {
    id: String(r.id),
    name: String(r.name),
    unit: "cm",
    isBuiltIn: Number(r.isBuiltIn) !== 0,
    isActive: Number(r.isActive) !== 0,
    sortOrder: Number(r.sortOrder),
    createdAt: Number(r.createdAt),
  };
}

function rowMeasurement(r: Record<string, unknown>): Measurement {
  return {
    id: String(r.id),
    checkinId: String(r.checkinId),
    measurementTypeId: String(r.measurementTypeId),
    valueCm: Number(r.valueCm),
    recordedAt: Number(r.recordedAt),
    createdAt: Number(r.createdAt),
  };
}

function rowPhoto(r: Record<string, unknown>): Photo {
  const mimeType = String(r.mimeType);
  return {
    id: String(r.id),
    checkinId: r.checkinId == null ? undefined : String(r.checkinId),
    recordedAt: Number(r.recordedAt),
    dateKey: String(r.dateKey),
    poseTag: r.poseTag as PoseTag,
    blob: blobFromSql(r.blob, mimeType),
    width: Number(r.width),
    height: Number(r.height),
    byteSize: Number(r.byteSize),
    mimeType,
    caption: strOrUndef(r.caption),
    createdAt: Number(r.createdAt),
  };
}

async function blobToSqlBytes(blob: Blob): Promise<Uint8Array> {
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

export function createSqliteRepositories(): AppRepositories {
  return {
    profile: {
      getPrimary: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM profile WHERE id = ?`,
          ["primary"],
        );
        return rows[0] ? rowProfile(rows[0]) : undefined;
      },
      putPrimary: async (profile) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(
          db,
          `INSERT OR REPLACE INTO profile (id, sex, heightCm, birthYear, updatedAt) VALUES (?,?,?,?,?)`,
          [
            profile.id,
            profile.sex,
            profile.heightCm ?? null,
            profile.birthYear ?? null,
            profile.updatedAt,
          ],
        );
      },
      listAll: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM profile`);
        return rows.map(rowProfile);
      },
      clear: async () => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM profile`);
      },
      bulkPut: async (rows) => {
        const db = await getBodylogSqliteDb();
        for (const p of rows) {
          await runWrite(
            db,
            `INSERT OR REPLACE INTO profile (id, sex, heightCm, birthYear, updatedAt) VALUES (?,?,?,?,?)`,
            [p.id, p.sex, p.heightCm ?? null, p.birthYear ?? null, p.updatedAt],
          );
        }
        if (inSqlTxn === 0) notifyStorageMutation();
      },
    },
    settings: {
      getLocal: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM settings WHERE id = ?`,
          ["local"],
        );
        return rows[0] ? rowSettings(rows[0]) : undefined;
      },
      putLocal: async (settings) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(
          db,
          `INSERT OR REPLACE INTO settings (id, weightUnit, lengthUnit, createdAt, updatedAt) VALUES (?,?,?,?,?)`,
          [settings.id, settings.weightUnit, settings.lengthUnit, settings.createdAt, settings.updatedAt],
        );
      },
      listAll: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM settings`);
        return rows.map(rowSettings);
      },
      clear: async () => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM settings`);
      },
      bulkPut: async (rows) => {
        const db = await getBodylogSqliteDb();
        for (const s of rows) {
          await runWrite(
            db,
            `INSERT OR REPLACE INTO settings (id, weightUnit, lengthUnit, createdAt, updatedAt) VALUES (?,?,?,?,?)`,
            [s.id, s.weightUnit, s.lengthUnit, s.createdAt, s.updatedAt],
          );
        }
        if (inSqlTxn === 0) notifyStorageMutation();
      },
    },
    checkins: {
      listRecent: async (limit) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM checkins ORDER BY recordedAt DESC LIMIT ?`,
          [limit],
        );
        return rows.map(rowCheckin);
      },
      listAll: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM checkins ORDER BY recordedAt DESC`,
        );
        return rows.map(rowCheckin);
      },
      listAllRaw: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM checkins`);
        return rows.map(rowCheckin);
      },
      getLatest: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM checkins ORDER BY recordedAt DESC LIMIT 1`,
        );
        return rows[0] ? rowCheckin(rows[0]) : undefined;
      },
      getById: async (id) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM checkins WHERE id = ?`, [id]);
        return rows[0] ? rowCheckin(rows[0]) : undefined;
      },
      put: async (checkin) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(
          db,
          `INSERT OR REPLACE INTO checkins (id, recordedAt, dateKey, weightKg, bodyFatPct, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
          [
            checkin.id,
            checkin.recordedAt,
            checkin.dateKey,
            checkin.weightKg ?? null,
            checkin.bodyFatPct ?? null,
            checkin.notes ?? null,
            checkin.createdAt,
            checkin.updatedAt,
          ],
        );
      },
      deleteById: async (id) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM checkins WHERE id = ?`, [id]);
      },
      getPrevious: async (beforeTs) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM checkins WHERE recordedAt < ? ORDER BY recordedAt DESC LIMIT 1`,
          [beforeTs],
        );
        return rows[0] ? rowCheckin(rows[0]) : undefined;
      },
      clear: async () => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM checkins`);
      },
      bulkPut: async (rows) => {
        const db = await getBodylogSqliteDb();
        for (const c of rows) {
          await runWrite(
            db,
            `INSERT OR REPLACE INTO checkins (id, recordedAt, dateKey, weightKg, bodyFatPct, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
            [
              c.id,
              c.recordedAt,
              c.dateKey,
              c.weightKg ?? null,
              c.bodyFatPct ?? null,
              c.notes ?? null,
              c.createdAt,
              c.updatedAt,
            ],
          );
        }
        if (inSqlTxn === 0) notifyStorageMutation();
      },
    },
    measurementTypes: {
      listAllSorted: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM measurementTypes ORDER BY sortOrder ASC`,
        );
        return rows.map(rowMeasurementType);
      },
      listAll: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM measurementTypes`);
        return rows.map(rowMeasurementType);
      },
      count: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT COUNT(*) as cnt FROM measurementTypes`,
        );
        return Number(rows[0]?.cnt ?? 0);
      },
      put: async (type) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(
          db,
          `INSERT OR REPLACE INTO measurementTypes (id, name, unit, isBuiltIn, isActive, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?)`,
          [
            type.id,
            type.name,
            type.unit,
            type.isBuiltIn ? 1 : 0,
            type.isActive ? 1 : 0,
            type.sortOrder,
            type.createdAt,
          ],
        );
      },
      updateName: async (id, name) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `UPDATE measurementTypes SET name = ? WHERE id = ?`, [name, id]);
      },
      setActive: async (id, isActive) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `UPDATE measurementTypes SET isActive = ? WHERE id = ?`, [
          isActive ? 1 : 0,
          id,
        ]);
      },
      clear: async () => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM measurementTypes`);
      },
      bulkPut: async (rows) => {
        const db = await getBodylogSqliteDb();
        for (const t of rows) {
          await runWrite(
            db,
            `INSERT OR REPLACE INTO measurementTypes (id, name, unit, isBuiltIn, isActive, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?)`,
            [
              t.id,
              t.name,
              t.unit,
              t.isBuiltIn ? 1 : 0,
              t.isActive ? 1 : 0,
              t.sortOrder,
              t.createdAt,
            ],
          );
        }
        if (inSqlTxn === 0) notifyStorageMutation();
      },
      ensureBuiltIns: async () => {
        const db = await getBodylogSqliteDb();
        await ensureBuiltInMeasurementTypes({
          listAll: async () => {
            const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM measurementTypes`);
            return rows.map(rowMeasurementType);
          },
          bulkPut: async (rows) => {
            for (const t of rows) {
              await runWrite(
                db,
                `INSERT OR REPLACE INTO measurementTypes (id, name, unit, isBuiltIn, isActive, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?)`,
                [
                  t.id,
                  t.name,
                  t.unit,
                  t.isBuiltIn ? 1 : 0,
                  t.isActive ? 1 : 0,
                  t.sortOrder,
                  t.createdAt,
                ],
              );
            }
            if (inSqlTxn === 0) notifyStorageMutation();
          },
        });
      },
    },
    measurements: {
      listByCheckin: async (checkinId) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM measurements WHERE checkinId = ?`,
          [checkinId],
        );
        return rows.map(rowMeasurement);
      },
      historyForType: async (measurementTypeId) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM measurements WHERE measurementTypeId = ? AND recordedAt >= 0 AND recordedAt <= ? ORDER BY recordedAt ASC`,
          [measurementTypeId, Number.MAX_SAFE_INTEGER],
        );
        return rows.map(rowMeasurement);
      },
      findByCheckinAndType: async (checkinId, measurementTypeId) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM measurements WHERE checkinId = ? AND measurementTypeId = ? LIMIT 1`,
          [checkinId, measurementTypeId],
        );
        return rows[0] ? rowMeasurement(rows[0]) : undefined;
      },
      put: async (measurement) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(
          db,
          `INSERT OR REPLACE INTO measurements (id, checkinId, measurementTypeId, valueCm, recordedAt, createdAt) VALUES (?,?,?,?,?,?)`,
          [
            measurement.id,
            measurement.checkinId,
            measurement.measurementTypeId,
            measurement.valueCm,
            measurement.recordedAt,
            measurement.createdAt,
          ],
        );
      },
      deleteById: async (id) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM measurements WHERE id = ?`, [id]);
      },
      updateRecordedAtForCheckin: async (checkinId, recordedAt) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `UPDATE measurements SET recordedAt = ? WHERE checkinId = ?`, [
          recordedAt,
          checkinId,
        ]);
      },
      deleteByCheckin: async (checkinId) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM measurements WHERE checkinId = ?`, [checkinId]);
      },
      listAll: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM measurements`);
        return rows.map(rowMeasurement);
      },
      clear: async () => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM measurements`);
      },
      bulkPut: async (rows) => {
        const db = await getBodylogSqliteDb();
        for (const m of rows) {
          await runWrite(
            db,
            `INSERT OR REPLACE INTO measurements (id, checkinId, measurementTypeId, valueCm, recordedAt, createdAt) VALUES (?,?,?,?,?,?)`,
            [m.id, m.checkinId, m.measurementTypeId, m.valueCm, m.recordedAt, m.createdAt],
          );
        }
        if (inSqlTxn === 0) notifyStorageMutation();
      },
    },
    photos: {
      put: async (photo) => {
        const db = await getBodylogSqliteDb();
        const bytes = await blobToSqlBytes(photo.blob);
        await runWriteNotify(
          db,
          `INSERT OR REPLACE INTO photos (id, checkinId, recordedAt, dateKey, poseTag, blob, width, height, byteSize, mimeType, caption, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            photo.id,
            photo.checkinId ?? null,
            photo.recordedAt,
            photo.dateKey,
            photo.poseTag,
            bytes,
            photo.width,
            photo.height,
            photo.byteSize,
            photo.mimeType,
            photo.caption ?? null,
            photo.createdAt,
          ],
        );
      },
      listAllRecent: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM photos ORDER BY recordedAt DESC`,
        );
        return rows.map(rowPhoto);
      },
      listByPoseRecent: async (poseTag) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM photos WHERE poseTag = ? ORDER BY recordedAt DESC`,
          [poseTag],
        );
        return rows.map(rowPhoto);
      },
      listByCheckin: async (checkinId) => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM photos WHERE checkinId = ?`,
          [checkinId],
        );
        return rows.map(rowPhoto);
      },
      deleteById: async (id) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM photos WHERE id = ?`, [id]);
      },
      deleteByCheckin: async (checkinId) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM photos WHERE checkinId = ?`, [checkinId]);
      },
      updatePoseTag: async (id, poseTag) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `UPDATE photos SET poseTag = ? WHERE id = ?`, [poseTag, id]);
      },
      listAll: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(db, `SELECT * FROM photos`);
        return rows.map(rowPhoto);
      },
      clear: async () => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `DELETE FROM photos`);
      },
      bulkPut: async (rows) => {
        const db = await getBodylogSqliteDb();
        for (const photo of rows) {
          const bytes = await blobToSqlBytes(photo.blob);
          await runWrite(
            db,
            `INSERT OR REPLACE INTO photos (id, checkinId, recordedAt, dateKey, poseTag, blob, width, height, byteSize, mimeType, caption, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              photo.id,
              photo.checkinId ?? null,
              photo.recordedAt,
              photo.dateKey,
              photo.poseTag,
              bytes,
              photo.width,
              photo.height,
              photo.byteSize,
              photo.mimeType,
              photo.caption ?? null,
              photo.createdAt,
            ],
          );
        }
        if (inSqlTxn === 0) notifyStorageMutation();
      },
    },
    appMeta: {
      getMeta: async () => {
        const db = await getBodylogSqliteDb();
        const rows = await queryRows<Record<string, unknown>>(
          db,
          `SELECT * FROM appMeta WHERE id = ?`,
          ["meta"],
        );
        return rows[0] ? rowAppMeta(rows[0]) : undefined;
      },
      putMeta: async (meta) => {
        const db = await getBodylogSqliteDb();
        await runWriteNotify(db, `INSERT OR REPLACE INTO appMeta (id, schemaVersion) VALUES (?,?)`, [
          meta.id,
          meta.schemaVersion,
        ]);
      },
    },
    maintenance: {
      open: () => getBodylogSqliteDb().then(() => undefined),
      resetDatabase: () => deleteBodylogSqliteDatabase(),
      replaceAllData: async ({ profile, settings, measurementTypes, checkins, measurements, photos }) => {
        const db = await getBodylogSqliteDb();
        await withTxn(db, async () => {
          await runWrite(db, `DELETE FROM photos`);
          await runWrite(db, `DELETE FROM measurements`);
          await runWrite(db, `DELETE FROM checkins`);
          await runWrite(db, `DELETE FROM measurementTypes`);
          await runWrite(db, `DELETE FROM profile`);
          await runWrite(db, `DELETE FROM settings`);
          for (const t of measurementTypes) {
            await runWrite(
              db,
              `INSERT OR REPLACE INTO measurementTypes (id, name, unit, isBuiltIn, isActive, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?)`,
              [
                t.id,
                t.name,
                t.unit,
                t.isBuiltIn ? 1 : 0,
                t.isActive ? 1 : 0,
                t.sortOrder,
                t.createdAt,
              ],
            );
          }
          for (const c of checkins) {
            await runWrite(
              db,
              `INSERT OR REPLACE INTO checkins (id, recordedAt, dateKey, weightKg, bodyFatPct, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
              [
                c.id,
                c.recordedAt,
                c.dateKey,
                c.weightKg ?? null,
                c.bodyFatPct ?? null,
                c.notes ?? null,
                c.createdAt,
                c.updatedAt,
              ],
            );
          }
          for (const m of measurements) {
            await runWrite(
              db,
              `INSERT OR REPLACE INTO measurements (id, checkinId, measurementTypeId, valueCm, recordedAt, createdAt) VALUES (?,?,?,?,?,?)`,
              [m.id, m.checkinId, m.measurementTypeId, m.valueCm, m.recordedAt, m.createdAt],
            );
          }
          for (const p of photos) {
            const bytes = await blobToSqlBytes(p.blob);
            await runWrite(
              db,
              `INSERT OR REPLACE INTO photos (id, checkinId, recordedAt, dateKey, poseTag, blob, width, height, byteSize, mimeType, caption, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                p.id,
                p.checkinId ?? null,
                p.recordedAt,
                p.dateKey,
                p.poseTag,
                bytes,
                p.width,
                p.height,
                p.byteSize,
                p.mimeType,
                p.caption ?? null,
                p.createdAt,
              ],
            );
          }
          for (const p of profile) {
            await runWrite(
              db,
              `INSERT OR REPLACE INTO profile (id, sex, heightCm, birthYear, updatedAt) VALUES (?,?,?,?,?)`,
              [p.id, p.sex, p.heightCm ?? null, p.birthYear ?? null, p.updatedAt],
            );
          }
          for (const s of settings) {
            await runWrite(
              db,
              `INSERT OR REPLACE INTO settings (id, weightUnit, lengthUnit, createdAt, updatedAt) VALUES (?,?,?,?,?)`,
              [s.id, s.weightUnit, s.lengthUnit, s.createdAt, s.updatedAt],
            );
          }
        });
      },
      clearAllData: async () => {
        const db = await getBodylogSqliteDb();
        await withTxn(db, async () => {
          await runWrite(db, `DELETE FROM photos`);
          await runWrite(db, `DELETE FROM measurements`);
          await runWrite(db, `DELETE FROM checkins`);
          await runWrite(db, `DELETE FROM measurementTypes`);
          await runWrite(db, `DELETE FROM profile`);
          await runWrite(db, `DELETE FROM settings`);
        });
      },
      runInWriteTransaction: async (action) => {
        const db = await getBodylogSqliteDb();
        return withTxn(db, action);
      },
    },
  };
}
