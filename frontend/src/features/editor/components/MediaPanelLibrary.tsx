/**
 * Adapter that renders editor media assets inside the existing MediaPanel.
 *
 * Placement:
 * frontend/src/features/editor/components/MediaPanelLibrary.tsx
 */

import {
  type MediaDragPayload,
} from "../lib/mediaDragPayload";
import MediaLibraryGrid from "./MediaLibraryGrid";

export interface EditorMediaAsset {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  url: string;
  thumbnailUrl?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}

export interface MediaPanelLibraryProps {
  assets: EditorMediaAsset[];
  selectedAssetId?: string | null;
  className?: string;
  disabled?: boolean;
  onSelectAsset?: (
    asset: EditorMediaAsset,
  ) => void;
  onOpenAsset?: (
    asset: EditorMediaAsset,
  ) => void;
}

function toDragPayload(
  asset: EditorMediaAsset,
): MediaDragPayload {
  return {
    assetId: asset.id,
    name: asset.name,
    kind: asset.type,
    sourceUrl: asset.url,
    thumbnailUrl:
      asset.thumbnailUrl ?? undefined,
    durationMs:
      asset.durationMs ?? undefined,
    metadata: asset.metadata,
  };
}

export function MediaPanelLibrary({
  assets,
  selectedAssetId = null,
  className,
  disabled = false,
  onSelectAsset,
  onOpenAsset,
}: MediaPanelLibraryProps) {
  const assetById = new Map(
    assets.map((asset) => [
      asset.id,
      asset,
    ]),
  );

  const payloads = assets.map(toDragPayload);

  function resolveAsset(
    payload: MediaDragPayload,
  ): EditorMediaAsset | undefined {
    return assetById.get(payload.assetId);
  }

  return (
    <MediaLibraryGrid
      assets={payloads}
      selectedAssetId={selectedAssetId}
      className={className}
      disabled={disabled}
      onSelectAsset={(payload) => {
        const asset = resolveAsset(payload);

        if (asset) {
          onSelectAsset?.(asset);
        }
      }}
      onOpenAsset={(payload) => {
        const asset = resolveAsset(payload);

        if (asset) {
          onOpenAsset?.(asset);
        }
      }}
    />
  );
}

export default MediaPanelLibrary;