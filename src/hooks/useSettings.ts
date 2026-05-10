import { useLiveStorageQuery } from "./useLiveStorageQuery";
import * as svc from "@/services/settingsService";
import { useAction } from "./useAction";

export function useSettings() {
  const data = useLiveStorageQuery(() => svc.get(), []);
  return { data: data ?? null, isLoading: data === undefined };
}

export const useUpdateSettings = () => useAction(svc.update);
