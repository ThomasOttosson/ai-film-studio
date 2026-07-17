/**
 * Media library panel for imported and AI-generated editor assets.
 *
 * Placement:
 * frontend/src/features/editor/components/MediaPanel.tsx
 */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { useTimeline } from "../state/TimelineProvider";
import type {
  TimelineClip,
  TimelineTrack,
} from "../types/timeline";

export type MediaAssetKind =
  | "video"
  | "audio"
  | "image";

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaAssetKind;
  url: string;
  durationMs?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  createdAt: string;
  source: "upload" | "ai";
}

export interface MediaPanelProps {
  assets: MediaAsset[];
  onAssetsChange?: (assets: MediaAsset[]) => void;
  onImportFiles?: (files: File[]) => Promise<MediaAsset[]>;
}

const DEFAULT_IMAGE_DURATION_MS = 5_000;
const DEFAULT_MEDIA_DURATION_MS = 10_000;

function getFileKind(file: File): MediaAssetKind | null {
  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  if (file.type.startsWith("image/")) {
    return "image";
  }

  return null;
}

function getTrackKind(
  assetKind: MediaAssetKind,
): TimelineTrack["kind"] {
  return assetKind === "audio" ? "audio" : "video";
}

function getClipKind(
  assetKind: MediaAssetKind,
): TimelineClip["kind"] {
  return assetKind;
}

function createLocalAsset(file: File): MediaAsset | null {
  const kind = getFileKind(file);

  if (!kind) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind,
    url: URL.createObjectURL(file),
    createdAt: new Date().toISOString(),
    source: "upload",
  };
}

function findTargetTrack(
  tracks: TimelineTrack[],
  kind: TimelineTrack["kind"],
): TimelineTrack | null {
  return (
    tracks.find(
      (track) => track.kind === kind && !track.locked,
    ) ?? null
  );
}

export function MediaPanel({
  assets,
  onAssetsChange,
  onImportFiles,
}: MediaPanelProps) {
  const { project, dispatch } = useTimeline();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return assets;
    }

    return assets.filter((asset) =>
      asset.name.toLowerCase().includes(normalizedQuery),
    );
  }, [assets, query]);

  const importFiles = useCallback(
    async (files: File[]) => {
      const supportedFiles = files.filter(
        (file) => getFileKind(file) !== null,
      );

      if (supportedFiles.length === 0) {
        return;
      }

      setIsImporting(true);

      try {
        const importedAssets = onImportFiles
          ? await onImportFiles(supportedFiles)
          : supportedFiles
              .map(createLocalAsset)
              .filter(
                (asset): asset is MediaAsset =>
                  asset !== null,
              );

        onAssetsChange?.([...assets, ...importedAssets]);
      } finally {
        setIsImporting(false);
      }
    },
    [assets, onAssetsChange, onImportFiles],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      void importFiles(files);
      event.target.value = "";
    },
    [importFiles],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      void importFiles(Array.from(event.dataTransfer.files));
    },
    [importFiles],
  );

  const addAssetToTimeline = useCallback(
    (asset: MediaAsset) => {
      const trackKind = getTrackKind(asset.kind);
      let targetTrack = findTargetTrack(
        project.tracks,
        trackKind,
      );

      if (!targetTrack) {
        targetTrack = {
          id: crypto.randomUUID(),
          name:
            trackKind === "audio"
              ? "Audio"
              : "Video",
          kind: trackKind,
          order: project.tracks.length,
          clips: [],
          locked: false,
          hidden: false,
          muted: false,
        };

        dispatch({
          type: "track/add",
          track: targetTrack,
        });
      }

      const durationMs =
        asset.durationMs ??
        (asset.kind === "image"
          ? DEFAULT_IMAGE_DURATION_MS
          : DEFAULT_MEDIA_DURATION_MS);

      const clip: TimelineClip = {
        id: crypto.randomUUID(),
        trackId: targetTrack.id,
        name: asset.name,
        kind: getClipKind(asset.kind),
        sourceUrl: asset.url,
        startMs: project.playheadMs,
        durationMs,
        sourceStartMs: 0,
        sourceDurationMs: durationMs,
        playbackRate: 1,
        opacity: 1,
        volume: 1,
        locked: false,
        metadata: {
          mediaAssetId: asset.id,
          source: asset.source,
          width: asset.width,
          height: asset.height,
          thumbnailUrl: asset.thumbnailUrl,
        },
      };

      dispatch({
        type: "clip/add",
        clip,
      });

      dispatch({
        type: "selection/set",
        selection: {
          clipIds: [clip.id],
          trackIds: [targetTrack.id],
        },
      });
    },
    [
      dispatch,
      project.playheadMs,
      project.tracks,
    ],
  );

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-neutral-800 bg-neutral-950 text-neutral-100">
      <header className="space-y-3 border-b border-neutral-800 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Media
          </h2>

          <button
            className="rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-wait disabled:opacity-50"
            disabled={isImporting}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {isImporting ? "Importing…" : "Import"}
          </button>
        </div>

        <input
          accept="video/*,audio/*,image/*"
          className="hidden"
          multiple
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />

        <input
          aria-label="Search media"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search media"
          type="search"
          value={query}
        />
      </header>

      <div
        className={[
          "min-h-0 flex-1 overflow-y-auto p-3",
          dragActive ? "bg-blue-950/30" : "",
        ].join(" ")}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget as Node | null,
            )
          ) {
            setDragActive(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {filteredAssets.length === 0 ? (
          <button
            className="grid h-full min-h-40 w-full place-items-center rounded-lg border border-dashed border-neutral-700 p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <span>
              <span className="block text-xs font-medium text-neutral-300">
                Drop media here
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-neutral-500">
                Video, audio and images are supported.
              </span>
            </span>
          </button>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <li key={asset.id}>
                <button
                  className="group w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 text-left hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  onDoubleClick={() =>
                    addAssetToTimeline(asset)
                  }
                  title="Double-click to add at playhead"
                  type="button"
                >
                  <span className="relative block aspect-video overflow-hidden bg-neutral-800">
                    {asset.thumbnailUrl ||
                    asset.kind === "image" ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={
                          asset.thumbnailUrl ??
                          asset.url
                        }
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-[10px] uppercase tracking-widest text-neutral-500">
                        {asset.kind}
                      </span>
                    )}

                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 text-[9px] uppercase tracking-wide text-neutral-200">
                      {asset.kind}
                    </span>
                  </span>

                  <span className="block p-2">
                    <span className="block truncate text-xs font-medium text-neutral-200">
                      {asset.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] capitalize text-neutral-500">
                      {asset.source}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}