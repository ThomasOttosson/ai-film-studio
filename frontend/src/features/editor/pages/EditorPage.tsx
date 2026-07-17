/**
 * Production editor page that composes the timeline, preview,
 * media library, and inspector into a complete workspace.
 *
 * Placement:
 * frontend/src/features/editor/pages/EditorPage.tsx
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createEmptyTimelineProject,
} from "../state/TimelineProvider";
import type { TimelineProject } from "../types/timeline";
import {
  MediaPanel,
  type MediaAsset,
} from "../components/MediaPanel";
import { InspectorPanel } from "../components/InspectorPanel";
import { VideoEditor } from "../components/VideoEditor";
import { VideoPreview } from "../components/VideoPreview";

const MEDIA_STORAGE_KEY = "ai-film-studio:media-assets";
const PROJECT_STORAGE_KEY = "ai-film-studio:timeline-project";

function readStoredAssets(): MediaAsset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(
      MEDIA_STORAGE_KEY,
    );

    if (!rawValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (asset): asset is MediaAsset =>
        typeof asset === "object" &&
        asset !== null &&
        typeof (asset as MediaAsset).id === "string" &&
        typeof (asset as MediaAsset).name === "string" &&
        typeof (asset as MediaAsset).url === "string",
    );
  } catch {
    return [];
  }
}

function readStoredProject(): TimelineProject {
  const fallbackProject = createEmptyTimelineProject();

  if (typeof window === "undefined") {
    return fallbackProject;
  }

  try {
    const rawValue = window.localStorage.getItem(
      PROJECT_STORAGE_KEY,
    );

    if (!rawValue) {
      return fallbackProject;
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null
    ) {
      return fallbackProject;
    }

    return {
      ...fallbackProject,
      ...(parsedValue as Partial<TimelineProject>),
      selection: fallbackProject.selection,
      viewport: {
        ...fallbackProject.viewport,
        ...(parsedValue as Partial<TimelineProject>)
          .viewport,
      },
      tracks: Array.isArray(
        (parsedValue as Partial<TimelineProject>).tracks,
      )
        ? (
            parsedValue as Partial<TimelineProject>
          ).tracks ?? []
        : [],
    };
  } catch {
    return fallbackProject;
  }
}

function revokeRemovedObjectUrls(
  previousAssets: MediaAsset[],
  nextAssets: MediaAsset[],
): void {
  const nextAssetIds = new Set(
    nextAssets.map((asset) => asset.id),
  );

  for (const asset of previousAssets) {
    if (
      asset.source === "upload" &&
      asset.url.startsWith("blob:") &&
      !nextAssetIds.has(asset.id)
    ) {
      URL.revokeObjectURL(asset.url);
    }
  }
}

export function EditorPage() {
  const initialProject = useMemo(
    () => readStoredProject(),
    [],
  );
  const [assets, setAssets] = useState<MediaAsset[]>(
    () => readStoredAssets(),
  );

  const handleAssetsChange = useCallback(
    (nextAssets: MediaAsset[]) => {
      setAssets((currentAssets) => {
        revokeRemovedObjectUrls(
          currentAssets,
          nextAssets,
        );

        return nextAssets;
      });
    },
    [],
  );

  useEffect(() => {
    try {
      const persistentAssets = assets.filter(
        (asset) => !asset.url.startsWith("blob:"),
      );

      window.localStorage.setItem(
        MEDIA_STORAGE_KEY,
        JSON.stringify(persistentAssets),
      );
    } catch {
      // Local persistence is best-effort only.
    }
  }, [assets]);

  useEffect(
    () => () => {
      for (const asset of assets) {
        if (
          asset.source === "upload" &&
          asset.url.startsWith("blob:")
        ) {
          URL.revokeObjectURL(asset.url);
        }
      }
    },
    [assets],
  );

  return (
    <VideoEditor
      inspectorPanel={<InspectorPanel />}
      mediaPanel={
        <MediaPanel
          assets={assets}
          onAssetsChange={handleAssetsChange}
        />
      }
      preview={<VideoPreview />}
      project={initialProject}
    />
  );
}

export default EditorPage;