import type { Settings } from "@/db/db";
import { settingsUpdateSchema } from "@/lib/validationSchemas";
import { getRepositories } from "@/storage/factory";

const repos = getRepositories();

export const get = (): Promise<Settings | undefined> => repos.settings.getLocal();

export async function update(
  patch: Partial<Omit<Settings, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const parsed = settingsUpdateSchema.parse(patch);
  const now = Date.now();
  const existing: Settings = (await repos.settings.getLocal()) ?? {
    id: "local",
    weightUnit: "kg",
    lengthUnit: "cm",
    createdAt: now,
    updatedAt: now,
  };
  await repos.settings.putLocal({ ...existing, ...parsed, id: "local", updatedAt: now });
}
