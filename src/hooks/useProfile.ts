import { useLiveStorageQuery } from "./useLiveStorageQuery";
import * as svc from "@/services/profileService";
import { useAction } from "./useAction";

export function useProfile() {
  const data = useLiveStorageQuery(() => svc.get(), []);
  return { data: data ?? null, isLoading: data === undefined };
}

export const useUpdateProfile = () => useAction(svc.update);
