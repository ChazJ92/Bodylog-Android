/** DDL mirroring Dexie v2 stores (field names match `src/db/db.ts`). */
export const BODYLOG_SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY NOT NULL,
  sex TEXT NOT NULL,
  heightCm REAL,
  birthYear INTEGER,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profile_updatedAt ON profile(updatedAt);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  weightUnit TEXT NOT NULL,
  lengthUnit TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_settings_updatedAt ON settings(updatedAt);

CREATE TABLE IF NOT EXISTS appMeta (
  id TEXT PRIMARY KEY NOT NULL,
  schemaVersion INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY NOT NULL,
  recordedAt INTEGER NOT NULL,
  dateKey TEXT NOT NULL,
  weightKg REAL,
  bodyFatPct REAL,
  notes TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checkins_recordedAt ON checkins(recordedAt);
CREATE INDEX IF NOT EXISTS idx_checkins_dateKey ON checkins(dateKey);
CREATE INDEX IF NOT EXISTS idx_checkins_createdAt ON checkins(createdAt);

CREATE TABLE IF NOT EXISTS measurementTypes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  isBuiltIn INTEGER NOT NULL,
  isActive INTEGER NOT NULL,
  sortOrder INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mt_name ON measurementTypes(name);
CREATE INDEX IF NOT EXISTS idx_mt_isActive ON measurementTypes(isActive);
CREATE INDEX IF NOT EXISTS idx_mt_sortOrder ON measurementTypes(sortOrder);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY NOT NULL,
  checkinId TEXT NOT NULL,
  measurementTypeId TEXT NOT NULL,
  valueCm REAL NOT NULL,
  recordedAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meas_checkinId ON measurements(checkinId);
CREATE INDEX IF NOT EXISTS idx_meas_measurementTypeId ON measurements(measurementTypeId);
CREATE INDEX IF NOT EXISTS idx_meas_recordedAt ON measurements(recordedAt);
CREATE INDEX IF NOT EXISTS idx_meas_type_recorded ON measurements(measurementTypeId, recordedAt);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  checkinId TEXT,
  recordedAt INTEGER NOT NULL,
  dateKey TEXT NOT NULL,
  poseTag TEXT NOT NULL,
  blob BLOB NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  byteSize INTEGER NOT NULL,
  mimeType TEXT NOT NULL,
  caption TEXT,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_checkinId ON photos(checkinId);
CREATE INDEX IF NOT EXISTS idx_photos_recordedAt ON photos(recordedAt);
CREATE INDEX IF NOT EXISTS idx_photos_dateKey ON photos(dateKey);
CREATE INDEX IF NOT EXISTS idx_photos_poseTag ON photos(poseTag);
`;
