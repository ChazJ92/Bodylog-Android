import type { Profile } from "@/db/db";
import { profileUpdateSchema } from "@/lib/validationSchemas";
import { getRepositories } from "@/storage/factory";

const repos = getRepositories();

export const get = (): Promise<Profile | undefined> => repos.profile.getPrimary();

export async function update(
  patch: Partial<Omit<Profile, "id" | "updatedAt">>,
): Promise<void> {
  const parsed = profileUpdateSchema.parse(patch);
  const now = Date.now();
  const existing: Profile = (await repos.profile.getPrimary()) ?? {
    id: "primary",
    sex: "other",
    updatedAt: now,
  };
  await repos.profile.putPrimary({ ...existing, ...parsed, id: "primary", updatedAt: now });
}
