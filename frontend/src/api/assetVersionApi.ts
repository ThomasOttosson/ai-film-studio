import apiClient from "./client";

export type AssetType = "image" | "audio" | "video" | "movie" | "music";

export interface AssetVersion {
  id: number;
  version_number: number;
  b2_key: string;
  b2_url: string;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  created_at: string;
  is_current: boolean;
}

export interface AssetVersionList {
  asset_id: number | null;
  asset_type: string;
  scene_id: string | null;
  current_version_id: number | null;
  versions: AssetVersion[];
}

export async function listSceneAssetVersions(
  projectId: string,
  sceneId: string | number,
  assetType: AssetType
): Promise<AssetVersionList> {
  const response = await apiClient.get<AssetVersionList>(
    `/api/projects/${projectId}/scenes/${sceneId}/assets/${assetType}/versions`
  );
  return response.data;
}

export async function restoreSceneAssetVersion(
  projectId: string,
  sceneId: string | number,
  assetType: AssetType,
  versionId: number
): Promise<AssetVersion> {
  const response = await apiClient.post<AssetVersion>(
    `/api/projects/${projectId}/scenes/${sceneId}/assets/${assetType}` +
      `/versions/${versionId}/restore`
  );
  return response.data;
}

export async function listProjectAssetVersions(
  projectId: string,
  assetType: AssetType
): Promise<AssetVersionList> {
  const response = await apiClient.get<AssetVersionList>(
    `/api/projects/${projectId}/assets/${assetType}/versions`
  );
  return response.data;
}

export async function restoreProjectAssetVersion(
  projectId: string,
  assetType: AssetType,
  versionId: number
): Promise<AssetVersion> {
  const response = await apiClient.post<AssetVersion>(
    `/api/projects/${projectId}/assets/${assetType}/versions/${versionId}/restore`
  );
  return response.data;
}
