import { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiFile,
  FiFilm,
  FiImage,
  FiMusic,
  FiSearch,
} from "react-icons/fi";
import type { Scene } from "../types/film";
import "./MediaLibrary.css";

type MediaType = "all" | "image" | "audio" | "video";

type MediaAsset = {
  id: string;
  sceneId: number;
  sceneTitle: string;
  type: Exclude<MediaType, "all">;
  url: string;
};

interface MediaLibraryProps {
  scenes: Scene[];
}

const INITIAL_VISIBLE_ASSETS = 8;
const ASSETS_PER_PAGE = 8;

function getMediaLabel(type: MediaAsset["type"]) {
  if (type === "image") return "Image";
  if (type === "audio") return "Audio";
  return "Video";
}

function getEmptyMessage(type: MediaType) {
  if (type === "image") return "No images generated yet.";
  if (type === "audio") return "No voice-overs generated yet.";
  if (type === "video") return "No videos generated yet.";
  return "No generated media matches your search.";
}

function MediaLibrary({ scenes }: MediaLibraryProps) {
  const [activeType, setActiveType] = useState<MediaType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ASSETS);

  const assets = useMemo<MediaAsset[]>(() => {
    return scenes.flatMap((scene) => {
      const sceneAssets: MediaAsset[] = [];

      if (scene.imageUrl) {
        sceneAssets.push({
          id: `image-${scene.id}`,
          sceneId: scene.id,
          sceneTitle: scene.title || `Scene ${scene.id}`,
          type: "image",
          url: scene.imageUrl,
        });
      }

      if (scene.audioUrl) {
        sceneAssets.push({
          id: `audio-${scene.id}`,
          sceneId: scene.id,
          sceneTitle: scene.title || `Scene ${scene.id}`,
          type: "audio",
          url: scene.audioUrl,
        });
      }

      if (scene.videoUrl) {
        sceneAssets.push({
          id: `video-${scene.id}`,
          sceneId: scene.id,
          sceneTitle: scene.title || `Scene ${scene.id}`,
          type: "video",
          url: scene.videoUrl,
        });
      }

      return sceneAssets;
    });
  }, [scenes]);

  const counts = useMemo(
    () => ({
      all: assets.length,
      image: assets.filter((asset) => asset.type === "image").length,
      audio: assets.filter((asset) => asset.type === "audio").length,
      video: assets.filter((asset) => asset.type === "video").length,
    }),
    [assets]
  );

  const filteredAssets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesType = activeType === "all" || asset.type === activeType;
      const matchesSearch =
        !normalizedQuery ||
        asset.sceneTitle.toLowerCase().includes(normalizedQuery) ||
        getMediaLabel(asset.type).toLowerCase().includes(normalizedQuery) ||
        String(asset.sceneId).includes(normalizedQuery);

      return matchesType && matchesSearch;
    });
  }, [activeType, assets, searchQuery]);

  const visibleAssets = filteredAssets.slice(0, visibleCount);
  const hasMoreAssets = visibleCount < filteredAssets.length;

  function handleTypeChange(type: MediaType) {
    setActiveType(type);
    setVisibleCount(INITIAL_VISIBLE_ASSETS);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setVisibleCount(INITIAL_VISIBLE_ASSETS);
  }

  return (
    <section className="media-library card card-dark mt-5">
      <div className="media-library-header">
        <div>
          <div className="media-library-title-row">
            <h2>Media Library</h2>
            <span className="media-library-total-badge">{assets.length}</span>
          </div>
          <p>Generated assets stored in Backblaze B2.</p>
        </div>

        <button
          type="button"
          className="media-library-collapse-button"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
          {isCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="media-library-toolbar">
            <div className="media-library-tabs" role="tablist" aria-label="Media type">
              <button
                type="button"
                className={activeType === "all" ? "active" : ""}
                onClick={() => handleTypeChange("all")}
                role="tab"
                aria-selected={activeType === "all"}
              >
                <FiFile /> All <span>{counts.all}</span>
              </button>
              <button
                type="button"
                className={activeType === "image" ? "active" : ""}
                onClick={() => handleTypeChange("image")}
                role="tab"
                aria-selected={activeType === "image"}
              >
                <FiImage /> Images <span>{counts.image}</span>
              </button>
              <button
                type="button"
                className={activeType === "audio" ? "active" : ""}
                onClick={() => handleTypeChange("audio")}
                role="tab"
                aria-selected={activeType === "audio"}
              >
                <FiMusic /> Audio <span>{counts.audio}</span>
              </button>
              <button
                type="button"
                className={activeType === "video" ? "active" : ""}
                onClick={() => handleTypeChange("video")}
                role="tab"
                aria-selected={activeType === "video"}
              >
                <FiFilm /> Videos <span>{counts.video}</span>
              </button>
            </div>

            <label className="media-library-search">
              <FiSearch aria-hidden="true" />
              <span className="visually-hidden">Search media</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search scene or type..."
              />
            </label>
          </div>

          {visibleAssets.length === 0 ? (
            <div className="media-library-empty">
              <FiFile />
              <p>{getEmptyMessage(activeType)}</p>
            </div>
          ) : (
            <>
              <div className="media-library-grid">
                {visibleAssets.map((asset) => (
                  <article className={`media-asset-card media-asset-${asset.type}`} key={asset.id}>
                    <div className="media-asset-preview">
                      {asset.type === "image" && (
                        <img src={asset.url} alt={asset.sceneTitle} loading="lazy" />
                      )}

                      {asset.type === "video" && (
                        <video src={asset.url} controls preload="metadata" />
                      )}

                      {asset.type === "audio" && (
                        <div className="media-audio-preview">
                          <FiMusic aria-hidden="true" />
                          <audio src={asset.url} controls preload="metadata" />
                        </div>
                      )}
                    </div>

                    <div className="media-asset-body">
                      <div className="media-asset-copy">
                        <strong title={asset.sceneTitle}>{asset.sceneTitle}</strong>
                        <span>
                          {getMediaLabel(asset.type)} · Scene {asset.sceneId}
                        </span>
                      </div>

                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="media-asset-open-button"
                        aria-label={`Open ${getMediaLabel(asset.type).toLowerCase()} for ${asset.sceneTitle}`}
                        title="Open original file"
                      >
                        <FiExternalLink />
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              <div className="media-library-footer">
                <span>
                  Showing {visibleAssets.length} of {filteredAssets.length} assets
                </span>

                {hasMoreAssets && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) => current + ASSETS_PER_PAGE)
                    }
                  >
                    Show more
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default MediaLibrary;