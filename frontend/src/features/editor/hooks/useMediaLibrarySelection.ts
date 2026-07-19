/**
 * Selection and activation state for the editor media library.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useMediaLibrarySelection.ts
 */

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  type EditorMediaAsset,
} from "../components/MediaPanelLibrary";

export interface UseMediaLibrarySelectionOptions {
  initialSelectedAssetId?: string | null;
  onSelectionChange?: (
    asset: EditorMediaAsset | null,
  ) => void;
  onActivateAsset?: (
    asset: EditorMediaAsset,
  ) => void;
}

export interface UseMediaLibrarySelectionResult {
  selectedAssetId: string | null;
  selectedAsset: EditorMediaAsset | null;
  selectAsset: (
    asset: EditorMediaAsset | null,
  ) => void;
  activateAsset: (
    asset: EditorMediaAsset,
  ) => void;
  clearSelection: () => void;
  isSelected: (
    assetOrId: EditorMediaAsset | string,
  ) => boolean;
}

export function useMediaLibrarySelection(
  assets: EditorMediaAsset[],
  {
    initialSelectedAssetId = null,
    onSelectionChange,
    onActivateAsset,
  }: UseMediaLibrarySelectionOptions = {},
): UseMediaLibrarySelectionResult {
  const [
    selectedAssetId,
    setSelectedAssetId,
  ] = useState<string | null>(
    initialSelectedAssetId,
  );

  const assetById = useMemo(
    () =>
      new Map(
        assets.map((asset) => [
          asset.id,
          asset,
        ]),
      ),
    [assets],
  );

  const selectedAsset = useMemo(
    () =>
      selectedAssetId
        ? assetById.get(selectedAssetId) ??
          null
        : null,
    [assetById, selectedAssetId],
  );

  const selectAsset = useCallback(
    (asset: EditorMediaAsset | null) => {
      setSelectedAssetId(asset?.id ?? null);
      onSelectionChange?.(asset);
    },
    [onSelectionChange],
  );

  const clearSelection = useCallback(() => {
    selectAsset(null);
  }, [selectAsset]);

  const activateAsset = useCallback(
    (asset: EditorMediaAsset) => {
      setSelectedAssetId(asset.id);
      onSelectionChange?.(asset);
      onActivateAsset?.(asset);
    },
    [
      onActivateAsset,
      onSelectionChange,
    ],
  );

  const isSelected = useCallback(
    (
      assetOrId:
        | EditorMediaAsset
        | string,
    ) => {
      const id =
        typeof assetOrId === "string"
          ? assetOrId
          : assetOrId.id;

      return selectedAssetId === id;
    },
    [selectedAssetId],
  );

  return {
    selectedAssetId,
    selectedAsset,
    selectAsset,
    activateAsset,
    clearSelection,
    isSelected,
  };
}

export default useMediaLibrarySelection;