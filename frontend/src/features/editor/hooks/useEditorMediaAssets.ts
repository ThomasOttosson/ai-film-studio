/**
 * Loads and normalizes media assets for the editor media workspace.
 *
 * Placement:
 * frontend/src/features/editor/hooks/useEditorMediaAssets.ts
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type EditorMediaAsset,
} from "../components/MediaPanelLibrary";

interface MediaAssetApiItem {
  id: string;
  name?: string | null;
  filename?: string | null;
  type:
    | "video"
    | "audio"
    | "image";
  url: string;
  thumbnailUrl?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

interface MediaAssetsApiResponse {
  assets: MediaAssetApiItem[];
}

export interface UseEditorMediaAssetsOptions {
  endpoint?: string;
  projectId?: string | null;
  enabled?: boolean;
  requestInit?: RequestInit;
}

export interface UseEditorMediaAssetsResult {
  assets: EditorMediaAsset[];
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  addAsset: (
    asset: EditorMediaAsset,
  ) => void;
  removeAsset: (
    assetId: string,
  ) => void;
  replaceAsset: (
    asset: EditorMediaAsset,
  ) => void;
}

function normalizeAsset(
  item: MediaAssetApiItem,
): EditorMediaAsset {
  return {
    id: item.id,
    name:
      item.name?.trim() ||
      item.filename?.trim() ||
      "Namnlös media",
    type: item.type,
    url: item.url,
    thumbnailUrl:
      item.thumbnailUrl ?? undefined,
    durationMs:
      item.durationMs ?? undefined,
    metadata:
      item.metadata ?? undefined,
  };
}

export function useEditorMediaAssets({
  endpoint = "/api/media",
  projectId = null,
  enabled = true,
  requestInit,
}: UseEditorMediaAssetsOptions = {}): UseEditorMediaAssetsResult {
  const [assets, setAssets] =
    useState<EditorMediaAsset[]>([]);
  const [isLoading, setIsLoading] =
    useState(enabled);
  const [error, setError] =
    useState<Error | null>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const reload = useCallback(
    async (): Promise<void> => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      abortControllerRef.current?.abort();

      const controller =
        new AbortController();
      abortControllerRef.current =
        controller;

      setIsLoading(true);
      setError(null);

      try {
        const url = new URL(
          endpoint,
          window.location.origin,
        );

        if (projectId) {
          url.searchParams.set(
            "projectId",
            projectId,
          );
        }

        const response = await fetch(
          url.toString(),
          {
            ...requestInit,
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              ...requestInit?.headers,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Kunde inte läsa media (${response.status}).`,
          );
        }

        const payload =
          (await response.json()) as MediaAssetsApiResponse;

        if (!Array.isArray(payload.assets)) {
          throw new Error(
            "Mediasvaret har ogiltigt format.",
          );
        }

        setAssets(
          payload.assets.map(
            normalizeAsset,
          ),
        );
      } catch (cause) {
        if (
          cause instanceof DOMException &&
          cause.name === "AbortError"
        ) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause
            : new Error(
                "Ett okänt mediafel inträffade.",
              ),
        );
      } finally {
        if (
          abortControllerRef.current ===
          controller
        ) {
          setIsLoading(false);
        }
      }
    },
    [
      enabled,
      endpoint,
      projectId,
      requestInit,
    ],
  );

  useEffect(() => {
    void reload();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [reload]);

  const addAsset = useCallback(
    (asset: EditorMediaAsset) => {
      setAssets((current) => {
        const exists = current.some(
          (item) => item.id === asset.id,
        );

        return exists
          ? current.map((item) =>
              item.id === asset.id
                ? asset
                : item,
            )
          : [asset, ...current];
      });
    },
    [],
  );

  const removeAsset = useCallback(
    (assetId: string) => {
      setAssets((current) =>
        current.filter(
          (asset) =>
            asset.id !== assetId,
        ),
      );
    },
    [],
  );

  const replaceAsset = useCallback(
    (asset: EditorMediaAsset) => {
      setAssets((current) =>
        current.map((item) =>
          item.id === asset.id
            ? asset
            : item,
        ),
      );
    },
    [],
  );

  return {
    assets,
    isLoading,
    error,
    reload,
    addAsset,
    removeAsset,
    replaceAsset,
  };
}

export default useEditorMediaAssets;