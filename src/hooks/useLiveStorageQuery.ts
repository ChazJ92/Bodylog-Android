import { useLiveQuery } from "dexie-react-hooks";
import { Capacitor } from "@capacitor/core";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getStorageRevision, subscribeStorageRevision } from "@/storage/storageRevision";

/**
 * Web: Dexie.liveQuery (unchanged). Native: refetch when `notifyStorageMutation` runs.
 */
export function useLiveStorageQuery<T>(
  querier: () => Promise<T> | T,
  deps: unknown[] = [],
): T | undefined {
  const isNative = Capacitor.isNativePlatform();
  const rev = useSyncExternalStore(subscribeStorageRevision, getStorageRevision, getStorageRevision);
  const [nativeData, setNativeData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    void Promise.resolve(querier()).then((v) => {
      if (!cancelled) setNativeData(v as T);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative, rev, ...deps]);

  const dexieData = useLiveQuery(
    () => {
      if (isNative) return Promise.resolve(undefined as T | undefined);
      return querier();
    },
    isNative ? [] : deps,
  );

  return isNative ? nativeData : dexieData;
}
