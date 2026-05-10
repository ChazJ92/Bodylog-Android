import type { Measurement } from "@/db/db";
import { newId } from "@/lib/ids";
import { measurementValueSchema } from "@/lib/validationSchemas";
import { getRepositories } from "@/storage/factory";

const repos = getRepositories();

export const listByCheckin = (checkinId: string) =>
  repos.measurements.listByCheckin(checkinId);

export const historyForType = (measurementTypeId: string) =>
  repos.measurements.historyForType(measurementTypeId);

export async function latestForType(measurementTypeId: string): Promise<Measurement | undefined> {
  const arr = await historyForType(measurementTypeId);
  arr.sort((a, b) => b.recordedAt - a.recordedAt);
  return arr[0];
}

export async function upsertForCheckin(
  checkinId: string,
  recordedAt: number,
  measurementTypeId: string,
  valueCm: number | undefined,
): Promise<void> {
  const existing = await repos.measurements.findByCheckinAndType(checkinId, measurementTypeId);
  // Delete-on-empty is intentional: clearing a field on the form should
  // remove the previously saved value. Only validate when a real numeric
  // value is being persisted.
  if (valueCm == null || !Number.isFinite(valueCm)) {
    if (existing) await repos.measurements.deleteById(existing.id);
    return;
  }
  const validated = measurementValueSchema.parse(valueCm);
  if (existing) {
    await repos.measurements.put({ ...existing, valueCm: validated, recordedAt });
  } else {
    await repos.measurements.put({
      id: newId(),
      checkinId,
      measurementTypeId,
      valueCm: validated,
      recordedAt,
      createdAt: Date.now(),
    });
  }
}
