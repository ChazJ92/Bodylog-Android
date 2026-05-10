import { Capacitor } from "@capacitor/core";
import { createDexieRepositories } from "./dexieRepositories";
import { createSqliteRepositories } from "./sqliteRepositories";
import type { AppRepositories } from "./repositories";

let repositories: AppRepositories | null = null;

export function getRepositories(): AppRepositories {
  if (!repositories) {
    repositories = Capacitor.isNativePlatform()
      ? createSqliteRepositories()
      : createDexieRepositories();
  }
  return repositories;
}

/** Test/helper override point; production uses Dexie (web) or SQLite (native). */
export function setRepositoriesForTesting(next: AppRepositories | null): void {
  repositories = next;
}
