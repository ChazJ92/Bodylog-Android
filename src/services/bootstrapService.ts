/**
 * Phase 2 — bootstrap service boundary.
 *
 * The app must call `ensureAppReady()` exactly once before rendering routes.
 * It opens the Dexie instance (so any v1 -> v2 migration runs and surfaces
 * its error here, not deep inside a service call) and then performs
 * idempotent seeding of the canonical singleton rows and built-in
 * measurement types.
 *
 * Idempotent: the result promise is memoized for the lifetime of the module
 * so concurrent or repeated callers share one execution.
 */
import type { AppMeta } from "@/db/db";
import { BUILT_IN_TYPES } from "@/db/builtIns";
import { getRepositories } from "@/storage/factory";

let readyPromise: Promise<void> | null = null;
const repos = getRepositories();

export function ensureAppReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await repos.maintenance.open();
      await syncEssentialData();
    })();
  }
  return readyPromise;
}

/** Idempotent: canonical profile/settings, built-ins, appMeta. Safe after import/clear. */
export async function syncEssentialData(): Promise<void> {
  await seedCanonicalSingletons();
  await seedMeasurementTypes();
  await ensureAppMeta();
}

async function seedCanonicalSingletons(): Promise<void> {
  const now = Date.now();

  const settings = await repos.settings.getLocal();
  if (!settings) {
    await repos.settings.putLocal({
      id: "local",
      weightUnit: "kg",
      lengthUnit: "cm",
      createdAt: now,
      updatedAt: now,
    });
  }

  const profile = await repos.profile.getPrimary();
  if (!profile) {
    await repos.profile.putPrimary({ id: "primary", sex: "other", updatedAt: now });
  }
}

async function seedMeasurementTypes(): Promise<void> {
  const now = Date.now();
  const typeCount = await repos.measurementTypes.count();
  if (typeCount === 0) {
    // Fresh DB: seed the canonical Phase 1 set in one go.
    await repos.measurementTypes.bulkPut(
      BUILT_IN_TYPES.map((t) => ({ ...t, createdAt: now })),
    );
  } else {
    // Existing DB: additively add only canonical built-ins that are missing.
    // Never wipes, never overwrites legacy rows.
    await repos.measurementTypes.ensureBuiltIns();
  }
}

async function ensureAppMeta(): Promise<void> {
  const meta = await repos.appMeta.getMeta();
  if (!meta) {
    await repos.appMeta.putMeta({ id: "meta", schemaVersion: 2 });
    return;
  }
  if (typeof meta.schemaVersion !== "number" || meta.schemaVersion < 2) {
    const next: AppMeta = { ...meta, id: "meta", schemaVersion: 2 };
    await repos.appMeta.putMeta(next);
  }
}
