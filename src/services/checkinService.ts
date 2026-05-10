import type { Checkin } from "@/db/db";
import { dateKeyFromRecordedAt } from "@/db/dateKey";
import { newId } from "@/lib/ids";
import { checkinPatchSchema, checkinPayloadSchema } from "@/lib/validationSchemas";
import { getRepositories } from "@/storage/factory";

const repos = getRepositories();

export type CheckinInput = {
  recordedAt: number;
  weightKg?: number;
  bodyFatPct?: number;
  notes?: string;
};

export const listRecent = (limit = 50) =>
  repos.checkins.listRecent(limit);

export const listAll = () =>
  repos.checkins.listAll();

export const getLatest = () =>
  repos.checkins.getLatest();

export const getById = (id: string) => repos.checkins.getById(id);

export async function createCheckin(input: CheckinInput): Promise<Checkin> {
  const parsed = checkinPayloadSchema.parse(input);
  const now = Date.now();
  const checkin: Checkin = {
    id: newId(),
    recordedAt: parsed.recordedAt,
    dateKey: dateKeyFromRecordedAt(parsed.recordedAt),
    weightKg: parsed.weightKg,
    bodyFatPct: parsed.bodyFatPct,
    notes: parsed.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await repos.checkins.put(checkin);
  return checkin;
}

export async function updateCheckin(id: string, patch: Partial<CheckinInput>): Promise<void> {
  const parsed = checkinPatchSchema.parse(patch);
  const existing = await repos.checkins.getById(id);
  if (!existing) throw new Error("Check-in not found");

  const recordedAtChanged =
    parsed.recordedAt !== undefined && parsed.recordedAt !== existing.recordedAt;
  const nextRecordedAt = parsed.recordedAt ?? existing.recordedAt;

  const next: Checkin = {
    ...existing,
    ...parsed,
    recordedAt: nextRecordedAt,
    // Keep dateKey consistent with recordedAt whenever it changes.
    dateKey: recordedAtChanged
      ? dateKeyFromRecordedAt(nextRecordedAt)
      : existing.dateKey,
    notes:
      parsed.notes !== undefined
        ? parsed.notes.trim() || undefined
        : existing.notes,
    updatedAt: Date.now(),
  };
  await repos.checkins.put(next);

  // Mirror recordedAt onto measurements when it changed.
  if (recordedAtChanged) {
    await repos.measurements.updateRecordedAtForCheckin(id, nextRecordedAt);
  }
}

export async function deleteCheckin(id: string): Promise<void> {
  await repos.maintenance.runInWriteTransaction(async () => {
    await repos.measurements.deleteByCheckin(id);
    await repos.photos.deleteByCheckin(id);
    await repos.checkins.deleteById(id);
  });
}

export async function getPrevious(beforeTs: number): Promise<Checkin | undefined> {
  return repos.checkins.getPrevious(beforeTs);
}
