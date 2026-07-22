import { useState } from "react";
import { generateMusic } from "../api/filmApi";
import VersionHistory from "./VersionHistory";

interface MusicPanelProps {
  projectId: string | null;
  defaultPrompt: string;
  durationSeconds: number;
  musicUrl: string;
  onMusicChange: (url: string) => void;
}

function MusicPanel({
  projectId,
  defaultPrompt,
  durationSeconds,
  musicUrl,
  onMusicChange,
}: MusicPanelProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) {
      alert("Enter a description for the background music.");
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateMusic({
        prompt,
        duration_seconds: durationSeconds,
        project_id: projectId,
      });
      onMusicChange(result.music_url);
    } catch (error) {
      console.error("Failed to generate music:", error);
      const detail = (
        error as { response?: { data?: { detail?: unknown } } }
      )?.response?.data?.detail;
      alert(
        typeof detail === "string" && detail
          ? detail
          : "Could not generate music. Check your backend terminal."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="card card-dark p-4 mt-5">
      <h2 className="h4 fw-bold mb-3">🎵 Background Music</h2>
      <p className="muted-text mb-3">
        Generate one score for the whole film (Genblaze · GMI Cloud
        minimax-music-2.5). It is mixed under the final movie.
      </p>

      <label className="form-label small">Music description</label>
      <textarea
        className="form-control mb-3"
        rows={2}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="e.g. Tense cinematic orchestral score, slow build"
      />

      <button
        className="btn btn-gradient"
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating
          ? "Generating music..."
          : musicUrl
            ? "Regenerate Music"
            : "Generate Music"}
      </button>

      {musicUrl && (
        <audio className="w-100 mt-3" controls src={musicUrl}>
          Your browser does not support the audio element.
        </audio>
      )}

      {projectId && musicUrl && (
        <VersionHistory
          projectId={projectId}
          assetType="music"
          label="Music"
          onRestored={(version) => onMusicChange(version.b2_url)}
        />
      )}
    </section>
  );
}

export default MusicPanel;
