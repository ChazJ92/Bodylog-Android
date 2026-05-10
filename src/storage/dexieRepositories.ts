import { ensureBuiltInMeasurementTypes } from "@/db/builtIns";
import { db, type AppMeta, type Checkin, type Measurement, type MeasurementType, type Photo, type PoseTag, type Profile, type Settings } from "@/db/db";
import type { AppRepositories } from "./repositories";

export function createDexieRepositories(): AppRepositories {
  return {
    profile: {
      getPrimary: () => db.profile.get("primary"),
      putPrimary: async (profile) => {
        await db.profile.put(profile);
      },
      listAll: () => db.profile.toArray(),
      clear: async () => {
        await db.profile.clear();
      },
      bulkPut: async (rows) => {
        await db.profile.bulkPut(rows);
      },
    },
    settings: {
      getLocal: () => db.settings.get("local"),
      putLocal: async (settings) => {
        await db.settings.put(settings);
      },
      listAll: () => db.settings.toArray(),
      clear: async () => {
        await db.settings.clear();
      },
      bulkPut: async (rows) => {
        await db.settings.bulkPut(rows);
      },
    },
    checkins: {
      listRecent: (limit) => db.checkins.orderBy("recordedAt").reverse().limit(limit).toArray(),
      listAll: () => db.checkins.orderBy("recordedAt").reverse().toArray(),
      listAllRaw: () => db.checkins.toArray(),
      getLatest: () => db.checkins.orderBy("recordedAt").reverse().first(),
      getById: (id) => db.checkins.get(id),
      put: async (checkin) => {
        await db.checkins.put(checkin);
      },
      deleteById: async (id) => {
        await db.checkins.delete(id);
      },
      getPrevious: async (beforeTs) =>
        db.checkins
          .where("recordedAt")
          .below(beforeTs)
          .reverse()
          .sortBy("recordedAt")
          .then((arr) => arr[0]),
      clear: async () => {
        await db.checkins.clear();
      },
      bulkPut: async (rows) => {
        await db.checkins.bulkPut(rows);
      },
    },
    measurementTypes: {
      listAllSorted: () => db.measurementTypes.orderBy("sortOrder").toArray(),
      listAll: () => db.measurementTypes.toArray(),
      count: () => db.measurementTypes.count(),
      put: async (type) => {
        await db.measurementTypes.put(type);
      },
      updateName: async (id, name) => {
        await db.measurementTypes.update(id, { name });
      },
      setActive: async (id, isActive) => {
        await db.measurementTypes.update(id, { isActive });
      },
      clear: async () => {
        await db.measurementTypes.clear();
      },
      bulkPut: async (rows) => {
        await db.measurementTypes.bulkPut(rows);
      },
      ensureBuiltIns: async () => {
        await ensureBuiltInMeasurementTypes({
          listAll: () => db.measurementTypes.toArray(),
          bulkPut: (rows) => db.measurementTypes.bulkPut(rows),
        });
      },
    },
    measurements: {
      listByCheckin: (checkinId) => db.measurements.where("checkinId").equals(checkinId).toArray(),
      historyForType: (measurementTypeId) =>
        db.measurements
          .where("[measurementTypeId+recordedAt]")
          .between([measurementTypeId, 0], [measurementTypeId, Number.MAX_SAFE_INTEGER])
          .toArray(),
      findByCheckinAndType: (checkinId, measurementTypeId) =>
        db.measurements
          .where("checkinId")
          .equals(checkinId)
          .and((m) => m.measurementTypeId === measurementTypeId)
          .first(),
      put: async (measurement) => {
        await db.measurements.put(measurement);
      },
      deleteById: async (id) => {
        await db.measurements.delete(id);
      },
      updateRecordedAtForCheckin: async (checkinId, recordedAt) => {
        const rows = await db.measurements.where("checkinId").equals(checkinId).toArray();
        if (!rows.length) return;
        await db.measurements.bulkPut(rows.map((m) => ({ ...m, recordedAt })));
      },
      deleteByCheckin: async (checkinId) => {
        await db.measurements.where("checkinId").equals(checkinId).delete();
      },
      listAll: () => db.measurements.toArray(),
      clear: async () => {
        await db.measurements.clear();
      },
      bulkPut: async (rows) => {
        await db.measurements.bulkPut(rows);
      },
    },
    photos: {
      put: async (photo) => {
        await db.photos.put(photo);
      },
      listAllRecent: () => db.photos.orderBy("recordedAt").reverse().toArray(),
      listByPoseRecent: (poseTag) =>
        db.photos.where("poseTag").equals(poseTag).reverse().sortBy("recordedAt"),
      listByCheckin: (checkinId) => db.photos.where("checkinId").equals(checkinId).toArray(),
      deleteById: async (id) => {
        await db.photos.delete(id);
      },
      deleteByCheckin: async (checkinId) => {
        await db.photos.where("checkinId").equals(checkinId).delete();
      },
      updatePoseTag: async (id, poseTag) => {
        await db.photos.update(id, { poseTag });
      },
      listAll: () => db.photos.toArray(),
      clear: async () => {
        await db.photos.clear();
      },
      bulkPut: async (rows) => {
        await db.photos.bulkPut(rows);
      },
    },
    appMeta: {
      getMeta: () => db.appMeta.get("meta"),
      putMeta: async (meta: AppMeta) => {
        await db.appMeta.put(meta);
      },
    },
    maintenance: {
      open: () => db.open(),
      resetDatabase: () => db.delete(),
      replaceAllData: async ({ profile, settings, measurementTypes, checkins, measurements, photos }) => {
        await db.transaction(
          "rw",
          [db.profile, db.settings, db.measurementTypes, db.checkins, db.measurements, db.photos],
          async () => {
            await Promise.all([
              db.profile.clear(),
              db.settings.clear(),
              db.measurementTypes.clear(),
              db.checkins.clear(),
              db.measurements.clear(),
              db.photos.clear(),
            ]);
            if (measurementTypes.length) await db.measurementTypes.bulkPut(measurementTypes);
            if (checkins.length) await db.checkins.bulkPut(checkins);
            if (measurements.length) await db.measurements.bulkPut(measurements);
            if (photos.length) await db.photos.bulkPut(photos);
            if (profile.length) await db.profile.bulkPut(profile);
            if (settings.length) await db.settings.bulkPut(settings);
          },
        );
      },
      clearAllData: async () => {
        await db.transaction(
          "rw",
          [db.profile, db.settings, db.measurementTypes, db.checkins, db.measurements, db.photos],
          async () => {
            await Promise.all([
              db.profile.clear(),
              db.settings.clear(),
              db.measurementTypes.clear(),
              db.checkins.clear(),
              db.measurements.clear(),
              db.photos.clear(),
            ]);
          },
        );
      },
      runInWriteTransaction: async <T>(action: () => Promise<T>) =>
        db.transaction(
          "rw",
          [db.checkins, db.measurements, db.photos],
          action,
        ),
    },
  };
}
