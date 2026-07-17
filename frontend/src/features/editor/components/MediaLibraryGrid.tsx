/**
 * Media library grid with searchable, draggable assets for the editor.
 *
 * Placement:
 * frontend/src/features/editor/components/MediaLibraryGrid.tsx
 */

import {
  type ChangeEvent,
  type ReactNode,
  useDeferredValue,
  useMemo,
  useState,
} from "react";

import DraggableMediaItem from "./DraggableMediaItem";
import {
  type MediaDragPayload,
} from "../lib/mediaDragPayload";

export interface MediaLibraryGridProps {
  assets: MediaDragPayload[];
  selectedAssetId?: string | null;
  className?: string;
  emptyState?: ReactNode;
  searchPlaceholder?: string;
  disabled?: boolean;
  onSelectAsset?: (
    asset: MediaDragPayload,
  ) => void;
  onOpenAsset?: (
    asset: MediaDragPayload,
  ) => void;
}

type MediaFilter =
  | "all"
  | MediaDragPayload["kind"];

const FILTERS: Array<{
  value: MediaFilter;
  label: string;
}> = [
  { value: "all", label: "Alla" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Ljud" },
  { value: "image", label: "Bilder" },
];

function formatDuration(
  durationMs: number | undefined,
): string | null {
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    return null;
  }

  const totalSeconds = Math.floor(
    durationMs / 1_000,
  );
  const hours = Math.floor(
    totalSeconds / 3_600,
  );
  const minutes = Math.floor(
    (totalSeconds % 3_600) / 60,
  );
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }

  return [
    minutes,
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

export function MediaLibraryGrid({
  assets,
  selectedAssetId = null,
  className,
  emptyState = "Inga mediafiler hittades.",
  searchPlaceholder = "Sök media...",
  disabled = false,
  onSelectAsset,
  onOpenAsset,
}: MediaLibraryGridProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<MediaFilter>("all");

  const deferredQuery =
    useDeferredValue(query);

  const filteredAssets = useMemo(() => {
    const normalizedQuery =
      deferredQuery.trim().toLocaleLowerCase();

    return assets.filter((asset) => {
      if (
        filter !== "all" &&
        asset.kind !== filter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        asset.name
          .toLocaleLowerCase()
          .includes(normalizedQuery) ||
        asset.kind
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [assets, deferredQuery, filter]);

  function handleSearchChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    setQuery(event.target.value);
  }

  const composedClassName = [
    "editor-media-library",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={composedClassName}
      aria-label="Mediebibliotek"
    >
      <div className="editor-media-library__toolbar">
        <label className="editor-media-library__search">
          <span className="visually-hidden">
            Sök i mediebiblioteket
          </span>

          <input
            type="search"
            value={query}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            disabled={disabled}
            className="form-control"
          />
        </label>

        <div
          className="editor-media-library__filters"
          role="group"
          aria-label="Filtrera media"
        >
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={[
                "btn btn-sm",
                filter === item.value
                  ? "btn-primary"
                  : "btn-outline-secondary",
              ].join(" ")}
              aria-pressed={
                filter === item.value
              }
              disabled={disabled}
              onClick={() =>
                setFilter(item.value)
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div
          className="editor-media-library__empty"
          role="status"
        >
          {emptyState}
        </div>
      ) : (
        <div
          className="editor-media-library__grid"
          role="list"
        >
          {filteredAssets.map((asset) => {
            const duration =
              formatDuration(asset.durationMs);

            return (
              <div
                key={asset.assetId}
                role="listitem"
              >
                <DraggableMediaItem
                  payload={asset}
                  disabled={disabled}
                  selected={
                    selectedAssetId ===
                    asset.assetId
                  }
                  onSelect={onSelectAsset}
                  onOpen={onOpenAsset}
                >
                  <div className="editor-media-item__preview">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt=""
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="editor-media-item__placeholder"
                      >
                        {asset.kind.toUpperCase()}
                      </span>
                    )}

                    {duration && (
                      <span className="editor-media-item__duration">
                        {duration}
                      </span>
                    )}
                  </div>

                  <div className="editor-media-item__details">
                    <strong
                      className="editor-media-item__name"
                      title={asset.name}
                    >
                      {asset.name}
                    </strong>

                    <span className="editor-media-item__kind">
                      {asset.kind}
                    </span>
                  </div>
                </DraggableMediaItem>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MediaLibraryGrid;