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

export interface ProfileRepository {
  getPrimary(): Promise<Profile | undefined>;
  putPrimary(profile: Profile): Promise<void>;
  listAll(): Promise<Profile[]>;
  clear(): Promise<void>;
  bulkPut(rows: Profile[]): Promise<void>;
}

export interface SettingsRepository {
  getLocal(): Promise<Settings | undefined>;
  putLocal(settings: Settings): Promise<void>;
  listAll(): Promise<Settings[]>;
  clear(): Promise<void>;
  bulkPut(rows: Settings[]): Promise<void>;
}

export interface CheckinRepository {
  listRecent(limit: number): Promise<Checkin[]>;
  listAll(): Promise<Checkin[]>;
  listAllRaw(): Promise<Checkin[]>;
  getLatest(): Promise<Checkin | undefined>;
  getById(id: string): Promise<Checkin | undefined>;
  put(checkin: Checkin): Promise<void>;
  deleteById(id: string): Promise<void>;
  getPrevious(beforeTs: number): Promise<Checkin | undefined>;
  clear(): Promise<void>;
  bulkPut(rows: Checkin[]): Promise<void>;
}

export interface MeasurementTypeRepository {
  listAllSorted(): Promise<MeasurementType[]>;
  listAll(): Promise<MeasurementType[]>;
  count(): Promise<number>;
  put(type: MeasurementType): Promise<void>;
  updateName(id: string, name: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
  clear(): Promise<void>;
  bulkPut(rows: MeasurementType[]): Promise<void>;
  ensureBuiltIns(): Promise<void>;
}

export interface MeasurementRepository {
  listByCheckin(checkinId: string): Promise<Measurement[]>;
  historyForType(measurementTypeId: string): Promise<Measurement[]>;
  findByCheckinAndType(
    checkinId: string,
    measurementTypeId: string,
  ): Promise<Measurement | undefined>;
  put(measurement: Measurement): Promise<void>;
  deleteById(id: string): Promise<void>;
  updateRecordedAtForCheckin(checkinId: string, recordedAt: number): Promise<void>;
  deleteByCheckin(checkinId: string): Promise<void>;
  listAll(): Promise<Measurement[]>;
  clear(): Promise<void>;
  bulkPut(rows: Measurement[]): Promise<void>;
}

export interface PhotoRepository {
  put(photo: Photo): Promise<void>;
  listAllRecent(): Promise<Photo[]>;
  listByPoseRecent(poseTag: PoseTag): Promise<Photo[]>;
  listByCheckin(checkinId: string): Promise<Photo[]>;
  deleteById(id: string): Promise<void>;
  deleteByCheckin(checkinId: string): Promise<void>;
  updatePoseTag(id: string, poseTag: PoseTag): Promise<void>;
  listAll(): Promise<Photo[]>;
  clear(): Promise<void>;
  bulkPut(rows: Photo[]): Promise<void>;
}

export interface AppMetaRepository {
  getMeta(): Promise<AppMeta | undefined>;
  putMeta(meta: AppMeta): Promise<void>;
}

export interface MaintenanceRepository {
  open(): Promise<void>;
  resetDatabase(): Promise<void>;
  replaceAllData(rows: {
    profile: Profile[];
    settings: Settings[];
    measurementTypes: MeasurementType[];
    checkins: Checkin[];
    measurements: Measurement[];
    photos: Photo[];
  }): Promise<void>;
  clearAllData(): Promise<void>;
  runInWriteTransaction<T>(action: () => Promise<T>): Promise<T>;
}

export interface AppRepositories {
  profile: ProfileRepository;
  settings: SettingsRepository;
  checkins: CheckinRepository;
  measurementTypes: MeasurementTypeRepository;
  measurements: MeasurementRepository;
  photos: PhotoRepository;
  appMeta: AppMetaRepository;
  maintenance: MaintenanceRepository;
}
