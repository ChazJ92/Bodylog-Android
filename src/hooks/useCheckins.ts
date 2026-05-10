import { useLiveStorageQuery } from "./useLiveStorageQuery";
import * as svc from "@/services/checkinService";
import { useAction } from "./useAction";

export function useRecentCheckins(limit = 50) {
  const data = useLiveStorageQuery(() => svc.listRecent(limit), [limit]);
  return { data: data ?? [], isLoading: data === undefined };
}

export function useLatestCheckin() {
  const data = useLiveStorageQuery(() => svc.getLatest(), []);
  return { data: data ?? null, isLoading: data === undefined };
}

export function useCheckin(id: string | undefined) {
  const data = useLiveStorageQuery(() => (id ? svc.getById(id) : Promise.resolve(undefined)), [id]);
  return { data: data ?? null, isLoading: id ? data === undefined : false };
}

export function usePreviousCheckin(beforeTs: number | undefined) {
  const data = useLiveStorageQuery(
    () => (beforeTs ? svc.getPrevious(beforeTs) : Promise.resolve(undefined)),
    [beforeTs],
  );
  return { data: data ?? null, isLoading: beforeTs ? data === undefined : false };
}

export const useCreateCheckin = () => useAction(svc.createCheckin);
export const useUpdateCheckin = () => useAction(svc.updateCheckin);
export const useDeleteCheckin = () => useAction(svc.deleteCheckin);
