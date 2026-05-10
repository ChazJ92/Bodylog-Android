import { useLiveStorageQuery } from "./useLiveStorageQuery";
import * as svc from "@/services/photoService";
import type { PoseTag } from "@/db/db";
import { useAction } from "./useAction";

export function usePhotos() {
  const data = useLiveStorageQuery(() => svc.listAll(), []);
  return { data: data ?? [], isLoading: data === undefined };
}

export function usePhotosByPose(pose: PoseTag) {
  const data = useLiveStorageQuery(() => svc.listByPose(pose), [pose]);
  return { data: data ?? [], isLoading: data === undefined };
}

export const useAddPhoto = () => useAction(svc.addPhoto);
export const useDeletePhoto = () => useAction(svc.deletePhoto);
export const useUpdatePoseTag = () => useAction(svc.updatePoseTag);
