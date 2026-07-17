import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiMaximize,
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
  FiVolume1,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import type { Scene } from "../types/film";

export interface PreviewPlayerProps {
  scene?: Scene;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayingChange: (isPlaying: boolean) => void;
  onTimeChange: (time: number) => void;
  className?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const frames = Math.floor((safeSeconds % 1) * 10);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}.${frames}`;
}

function PreviewPlayer({
  scene,
  currentTime,
  duration,
  isPlaying,
  onPlayingChange,
  onTimeChange,
  className = "",
}: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const [volume, setVolume] = useState(0.8);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [mediaError, setMediaError] = useState(false);

  const safeDuration = Math.max(duration, 0);
  const safeCurrentTime = clamp(currentTime, 0, safeDuration || 0);
  const progress = safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0;

  const mediaType = useMemo(() => {
    if (scene?.videoUrl) return "video";
    if (scene?.imageUrl) return "image";
    return "empty";
  }, [scene?.imageUrl, scene?.videoUrl]);

  useEffect(() => {
    setMediaError(false);
  }, [scene?.id, scene?.imageUrl, scene?.videoUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scene?.videoUrl) return;

    const mediaDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const targetTime = mediaDuration > 0
      ? clamp(safeCurrentTime, 0, Math.max(mediaDuration - 0.01, 0))
      : safeCurrentTime;

    if (Math.abs(video.currentTime - targetTime) > 0.25) {
      video.currentTime = targetTime;
    }
  }, [safeCurrentTime, scene?.videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    async function syncPlayback() {
      try {
        if (isPlaying) {
          if (video && scene?.videoUrl) await video.play();
          if (audio && scene?.audioUrl) await audio.play();
        } else {
          video?.pause();
          audio?.pause();
        }
      } catch {
        onPlayingChange(false);
      }
    }

    void syncPlayback();
  }, [isPlaying, onPlayingChange, scene?.audioUrl, scene?.videoUrl]);

  useEffect(() => {
    if (!isPlaying || mediaType === "video" || safeDuration <= 0) {
      lastFrameTimeRef.current = null;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      const nextTime = safeCurrentTime + elapsed;

      if (nextTime >= safeDuration) {
        onTimeChange(safeDuration);
        onPlayingChange(false);
        return;
      }

      onTimeChange(nextTime);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
    };
  }, [isPlaying, mediaType, onPlayingChange, onTimeChange, safeCurrentTime, safeDuration]);

  function togglePlayback() {
    if (safeDuration <= 0) return;

    if (safeCurrentTime >= safeDuration) {
      onTimeChange(0);
      onPlayingChange(true);
      return;
    }

    onPlayingChange(!isPlaying);
  }

  function seekTo(nextTime: number) {
    onTimeChange(clamp(nextTime, 0, safeDuration));
  }

  function toggleMute() {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume || 0.8);
    }
  }

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser or embedding context.
    }
  }

  const VolumeIcon = volume === 0 ? FiVolumeX : volume < 0.5 ? FiVolume1 : FiVolume2;

  return (
    <div
      ref={containerRef}
      className={`preview-player ${className}`.trim()}
      aria-label="Video preview"
    >
      <style>{`
        .preview-player {
          display: flex;
          min-height: 0;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 14px;
          background: #090d15;
          color: #f8fafc;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
        }

        .preview-player-stage {
          position: relative;
          display: grid;
          min-height: 280px;
          flex: 1;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(circle at center, rgba(30, 41, 59, 0.7), transparent 65%),
            #030712;
        }

        .preview-player-stage::before {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 24px 24px;
          content: "";
          pointer-events: none;
        }

        .preview-player-media {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          max-height: 68vh;
          object-fit: contain;
          background: #000;
        }

        .preview-player-placeholder {
          position: relative;
          z-index: 1;
          display: grid;
          max-width: 420px;
          gap: 10px;
          padding: 36px;
          text-align: center;
        }

        .preview-player-placeholder strong {
          font-size: 1.05rem;
        }

        .preview-player-placeholder span {
          color: #94a3b8;
          font-size: .88rem;
          line-height: 1.5;
        }

        .preview-player-scene-badge {
          position: absolute;
          z-index: 2;
          top: 14px;
          left: 14px;
          max-width: calc(100% - 28px);
          overflow: hidden;
          padding: 7px 10px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          background: rgba(2, 6, 23, .7);
          backdrop-filter: blur(10px);
          color: #e2e8f0;
          font-size: .78rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview-player-controls {
          position: relative;
          z-index: 3;
          display: grid;
          gap: 10px;
          padding: 12px 14px 14px;
          border-top: 1px solid rgba(148, 163, 184, .14);
          background: rgba(10, 15, 25, .96);
        }

        .preview-player-scrubber {
          width: 100%;
          height: 5px;
          margin: 0;
          accent-color: #8b5cf6;
          cursor: pointer;
        }

        .preview-player-control-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }

        .preview-player-button-group {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .preview-player-button-group:last-child {
          justify-content: flex-end;
        }

        .preview-player-button {
          display: inline-grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
          transition: background .15s ease, color .15s ease, transform .15s ease;
        }

        .preview-player-button:hover {
          background: rgba(148, 163, 184, .13);
          color: #fff;
        }

        .preview-player-button:active { transform: scale(.94); }

        .preview-player-button-primary {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #7c3aed;
          color: #fff;
        }

        .preview-player-button-primary:hover { background: #8b5cf6; }

        .preview-player-time {
          color: #cbd5e1;
          font-variant-numeric: tabular-nums;
          font-size: .8rem;
          white-space: nowrap;
        }

        .preview-player-volume {
          width: 82px;
          accent-color: #8b5cf6;
        }

        .preview-player-progress-label {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
        }

        @media (max-width: 680px) {
          .preview-player-stage { min-height: 220px; }
          .preview-player-control-row { grid-template-columns: auto 1fr auto; }
          .preview-player-volume { display: none; }
          .preview-player-time { font-size: .72rem; }
        }
      `}</style>

      <div className="preview-player-stage">
        {scene?.title && (
          <div className="preview-player-scene-badge">{scene.title}</div>
        )}

        {mediaError ? (
          <div className="preview-player-placeholder">
            <strong>Media could not be loaded</strong>
            <span>Check that the generated media URL is still valid.</span>
          </div>
        ) : mediaType === "video" && scene?.videoUrl ? (
          <video
            ref={videoRef}
            className="preview-player-media"
            src={scene.videoUrl}
            playsInline
            preload="metadata"
            onClick={togglePlayback}
            onError={() => setMediaError(true)}
            onTimeUpdate={(event) => {
              if (!isPlaying) return;
              const nextTime = event.currentTarget.currentTime;
              if (Number.isFinite(nextTime)) onTimeChange(nextTime);
            }}
            onEnded={() => {
              onTimeChange(safeDuration);
              onPlayingChange(false);
            }}
          />
        ) : mediaType === "image" && scene?.imageUrl ? (
          <img
            className="preview-player-media"
            src={scene.imageUrl}
            alt={scene.title || "Scene preview"}
            onClick={togglePlayback}
            onError={() => setMediaError(true)}
          />
        ) : (
          <div className="preview-player-placeholder">
            <strong>{scene?.title || "No scene selected"}</strong>
            <span>
              {scene
                ? "Generate or attach an image or video to preview this scene."
                : "Select a clip on the timeline to show it here."}
            </span>
          </div>
        )}

        {scene?.audioUrl && (
          <audio
            ref={audioRef}
            src={scene.audioUrl}
            preload="metadata"
            onError={() => setMediaError(true)}
          />
        )}
      </div>

      <div className="preview-player-controls">
        <label className="preview-player-progress-label" htmlFor="preview-player-seek">
          Playback position
        </label>
        <input
          id="preview-player-seek"
          className="preview-player-scrubber"
          type="range"
          min={0}
          max={Math.max(safeDuration, 0.01)}
          step={0.01}
          value={safeCurrentTime}
          style={{ backgroundSize: `${progress}% 100%` }}
          onChange={(event) => seekTo(Number(event.target.value))}
        />

        <div className="preview-player-control-row">
          <div className="preview-player-button-group">
            <button
              className="preview-player-button"
              type="button"
              title="Back 5 seconds"
              aria-label="Back 5 seconds"
              onClick={() => seekTo(safeCurrentTime - 5)}
            >
              <FiSkipBack />
            </button>

            <button
              className="preview-player-button preview-player-button-primary"
              type="button"
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlayback}
            >
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>

            <button
              className="preview-player-button"
              type="button"
              title="Forward 5 seconds"
              aria-label="Forward 5 seconds"
              onClick={() => seekTo(safeCurrentTime + 5)}
            >
              <FiSkipForward />
            </button>
          </div>

          <div className="preview-player-time">
            {formatTime(safeCurrentTime)} / {formatTime(safeDuration)}
          </div>

          <div className="preview-player-button-group">
            <button
              className="preview-player-button"
              type="button"
              title={volume === 0 ? "Unmute" : "Mute"}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              onClick={toggleMute}
            >
              <VolumeIcon />
            </button>

            <input
              className="preview-player-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              aria-label="Volume"
              onChange={(event) => setVolume(Number(event.target.value))}
            />

            <button
              className="preview-player-button"
              type="button"
              title="Fullscreen"
              aria-label="Fullscreen"
              onClick={() => void toggleFullscreen()}
            >
              <FiMaximize />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewPlayer;