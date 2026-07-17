import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronRight,
  FiFilm,
  FiImage,
  FiLoader,
  FiMusic,
  FiRefreshCw,
  FiSliders,
  FiType,
  FiX,
  FiZap,
} from "react-icons/fi";

export type AIActionCategory =
  | "video"
  | "image"
  | "audio"
  | "text"
  | "enhance";

export interface AIActionScene {
  id: string | number;
  title?: string;
  narration?: string;
  videoUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: string;
}

export interface AIActionDefinition {
  id: string;
  title: string;
  description: string;
  category: AIActionCategory;
  promptPlaceholder: string;
  requiresPrompt?: boolean;
}

export interface AIActionRequest {
  actionId: string;
  scene: AIActionScene;
  prompt: string;
  strength: number;
  preserveAudio: boolean;
}

export interface AIActionsPanelProps {
  scene?: AIActionScene | null;
  open?: boolean;
  onClose?: () => void;
  onRunAction?: (request: AIActionRequest) => Promise<void> | void;
  className?: string;
}

const actions: AIActionDefinition[] = [
  {
    id: "extend-scene",
    title: "Förläng scen",
    description: "Skapa fler bildrutor som fortsätter scenens rörelse och stil.",
    category: "video",
    promptPlaceholder: "Beskriv hur scenen ska fortsätta...",
    requiresPrompt: true,
  },
  {
    id: "cinematic-motion",
    title: "Cinematic motion",
    description: "Lägg till mjuk kamerarörelse och mer filmisk dynamik.",
    category: "video",
    promptPlaceholder: "Exempel: långsam dolly-in mot huvudpersonen",
  },
  {
    id: "remove-background",
    title: "Ta bort bakgrund",
    description: "Separera motivet från bakgrunden för compositing.",
    category: "image",
    promptPlaceholder: "Valfri instruktion för kanter och transparens",
  },
  {
    id: "restyle-shot",
    title: "Ändra visuell stil",
    description: "Återskapa klippet i en ny konstnärlig eller filmisk stil.",
    category: "image",
    promptPlaceholder: "Exempel: mörk nordisk noir med mjukt motljus",
    requiresPrompt: true,
  },
  {
    id: "enhance-quality",
    title: "Förbättra kvalitet",
    description: "Minska brus, skärp detaljer och förbättra ljus och färg.",
    category: "enhance",
    promptPlaceholder: "Valfria önskemål om färg, skärpa eller brus",
  },
  {
    id: "generate-voiceover",
    title: "Generera voice-over",
    description: "Skapa berättarröst från scenens narration eller egen text.",
    category: "audio",
    promptPlaceholder: "Skriv eller justera texten som ska läsas upp...",
    requiresPrompt: true,
  },
  {
    id: "clean-audio",
    title: "Rensa ljud",
    description: "Ta bort brus, eko och ojämn volym från scenens ljud.",
    category: "audio",
    promptPlaceholder: "Valfria instruktioner för ljudbearbetningen",
  },
  {
    id: "rewrite-narration",
    title: "Skriv om narration",
    description: "Förbättra scenens text utan att ändra dess huvudbetydelse.",
    category: "text",
    promptPlaceholder: "Exempel: kortare, mer dramatisk och filmisk",
    requiresPrompt: true,
  },
];

function categoryIcon(category: AIActionCategory) {
  switch (category) {
    case "video":
      return <FiFilm />;
    case "image":
      return <FiImage />;
    case "audio":
      return <FiMusic />;
    case "text":
      return <FiType />;
    case "enhance":
    default:
      return <FiZap />;
  }
}

function sceneFromEvent(event: Event): AIActionScene | null {
  const customEvent = event as CustomEvent<{ scene?: AIActionScene }>;
  return customEvent.detail?.scene ?? null;
}

export default function AIActionsPanel({
  scene: controlledScene,
  open: controlledOpen,
  onClose,
  onRunAction,
  className,
}: AIActionsPanelProps) {
  const [eventScene, setEventScene] = useState<AIActionScene | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState(actions[0].id);
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(70);
  const [preserveAudio, setPreserveAudio] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : eventOpen;
  const scene = controlledScene ?? eventScene;

  const selectedAction = useMemo(
    () => actions.find((action) => action.id === selectedActionId) ?? actions[0],
    [selectedActionId],
  );

  useEffect(() => {
    function handleOpen(event: Event) {
      const nextScene = sceneFromEvent(event);
      if (!nextScene) return;

      setEventScene(nextScene);
      setEventOpen(true);
      setPrompt(nextScene.narration ?? "");
      setCompleted(false);
      setError(null);
    }

    window.addEventListener("ai-film-studio:open-ai-actions", handleOpen);
    return () => {
      window.removeEventListener("ai-film-studio:open-ai-actions", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function closePanel() {
    if (isRunning) return;
    setEventOpen(false);
    setCompleted(false);
    setError(null);
    onClose?.();
  }

  function chooseAction(action: AIActionDefinition) {
    setSelectedActionId(action.id);
    setCompleted(false);
    setError(null);

    if (action.id === "generate-voiceover" && scene?.narration) {
      setPrompt(scene.narration);
    } else if (action.id !== "generate-voiceover") {
      setPrompt("");
    }
  }

  async function runAction() {
    if (!scene || isRunning) return;

    if (selectedAction.requiresPrompt && !prompt.trim()) {
      setError("Lägg till en instruktion innan du kör AI-åtgärden.");
      return;
    }

    setIsRunning(true);
    setCompleted(false);
    setError(null);

    const request: AIActionRequest = {
      actionId: selectedAction.id,
      scene,
      prompt: prompt.trim(),
      strength,
      preserveAudio,
    };

    try {
      if (onRunAction) {
        await onRunAction(request);
      } else {
        window.dispatchEvent(
          new CustomEvent("ai-film-studio:run-ai-action", {
            detail: request,
          }),
        );
      }

      setCompleted(true);
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "AI-åtgärden kunde inte startas.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={styles.backdrop} role="presentation" onMouseDown={closePanel}>
      <aside
        className={className}
        style={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="AI Actions"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={styles.header}>
          <div>
            <span style={styles.eyebrow}>AI Actions</span>
            <h2 style={styles.title}>{scene?.title || "Markerad scen"}</h2>
          </div>
          <button
            type="button"
            style={styles.iconButton}
            onClick={closePanel}
            aria-label="Stäng AI Actions"
            disabled={isRunning}
          >
            <FiX />
          </button>
        </header>

        {!scene ? (
          <div style={styles.emptyState}>
            <FiSliders size={26} />
            <strong>Ingen scen är markerad</strong>
            <span>Markera ett klipp och öppna AI Actions igen.</span>
          </div>
        ) : (
          <div style={styles.body}>
            <div style={styles.actionList}>
              {actions.map((action) => {
                const active = action.id === selectedAction.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => chooseAction(action)}
                    style={{
                      ...styles.actionButton,
                      ...(active ? styles.actionButtonActive : {}),
                    }}
                  >
                    <span style={styles.actionIcon}>
                      {categoryIcon(action.category)}
                    </span>
                    <span style={styles.actionCopy}>
                      <strong>{action.title}</strong>
                      <small>{action.description}</small>
                    </span>
                    <FiChevronRight />
                  </button>
                );
              })}
            </div>

            <section style={styles.settings}>
              <div style={styles.settingsHeader}>
                <span style={styles.settingsIcon}>
                  {categoryIcon(selectedAction.category)}
                </span>
                <div>
                  <span style={styles.eyebrow}>Vald åtgärd</span>
                  <h3 style={styles.settingsTitle}>{selectedAction.title}</h3>
                </div>
              </div>

              <label style={styles.field}>
                <span style={styles.label}>Instruktion</span>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={selectedAction.promptPlaceholder}
                  rows={6}
                  style={styles.textarea}
                  disabled={isRunning}
                />
              </label>

              <label style={styles.field}>
                <span style={styles.rangeHeader}>
                  <span style={styles.label}>AI-styrka</span>
                  <strong>{strength}%</strong>
                </span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={strength}
                  onChange={(event) => setStrength(Number(event.target.value))}
                  disabled={isRunning}
                  style={styles.range}
                />
              </label>

              {(selectedAction.category === "video" ||
                selectedAction.category === "enhance") && (
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={preserveAudio}
                    onChange={(event) => setPreserveAudio(event.target.checked)}
                    disabled={isRunning}
                  />
                  <span>
                    <strong>Behåll originalljud</strong>
                    <small>Ljudspåret lämnas oförändrat när videon bearbetas.</small>
                  </span>
                </label>
              )}

              {error ? <div style={styles.error}>{error}</div> : null}
              {completed ? (
                <div style={styles.success}>
                  <FiCheck /> Åtgärden har skickats till AI-kön.
                </div>
              ) : null}

              <button
                type="button"
                onClick={runAction}
                disabled={isRunning}
                style={{
                  ...styles.runButton,
                  ...(isRunning ? styles.runButtonDisabled : {}),
                }}
              >
                {isRunning ? (
                  <>
                    <FiLoader style={styles.spinner} /> Bearbetar...
                  </>
                ) : completed ? (
                  <>
                    <FiRefreshCw /> Kör igen
                  </>
                ) : (
                  <>
                    <FiZap /> Kör AI-åtgärd
                  </>
                )}
              </button>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    display: "flex",
    justifyContent: "flex-end",
    background: "rgba(2, 6, 23, 0.72)",
    backdropFilter: "blur(5px)",
  },
  panel: {
    width: "min(820px, 96vw)",
    height: "100%",
    overflow: "auto",
    background: "#0b1120",
    color: "#f8fafc",
    borderLeft: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "-24px 0 80px rgba(0, 0, 0, 0.38)",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "22px 24px",
    background: "rgba(11, 17, 32, 0.96)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
  },
  eyebrow: {
    display: "block",
    marginBottom: 4,
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: { margin: 0, fontSize: 22, lineHeight: 1.2 },
  iconButton: {
    display: "grid",
    placeItems: "center",
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.22)",
    background: "rgba(30, 41, 59, 0.72)",
    color: "#e2e8f0",
    cursor: "pointer",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "minmax(250px, 0.9fr) minmax(320px, 1.25fr)",
    minHeight: "calc(100vh - 87px)",
  },
  actionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 18,
    borderRight: "1px solid rgba(148, 163, 184, 0.14)",
  },
  actionButton: {
    display: "grid",
    gridTemplateColumns: "38px 1fr auto",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: 12,
    textAlign: "left",
    color: "#cbd5e1",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 12,
    cursor: "pointer",
  },
  actionButtonActive: {
    color: "#f8fafc",
    background: "rgba(124, 58, 237, 0.16)",
    borderColor: "rgba(167, 139, 250, 0.42)",
  },
  actionIcon: {
    display: "grid",
    placeItems: "center",
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "rgba(124, 58, 237, 0.17)",
    color: "#c4b5fd",
  },
  actionCopy: { display: "flex", flexDirection: "column", gap: 4 },
  settings: { padding: 24 },
  settingsHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  settingsIcon: {
    display: "grid",
    placeItems: "center",
    width: 44,
    height: 44,
    borderRadius: 12,
    color: "#ddd6fe",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
  },
  settingsTitle: { margin: 0, fontSize: 19 },
  field: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  label: { color: "#e2e8f0", fontSize: 13, fontWeight: 700 },
  textarea: {
    width: "100%",
    resize: "vertical",
    padding: 13,
    color: "#f8fafc",
    background: "#111827",
    border: "1px solid rgba(148, 163, 184, 0.23)",
    borderRadius: 12,
    outline: "none",
    font: "inherit",
    boxSizing: "border-box",
  },
  rangeHeader: { display: "flex", justifyContent: "space-between" },
  range: { width: "100%" },
  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    padding: 14,
    marginBottom: 20,
    borderRadius: 12,
    background: "rgba(30, 41, 59, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  error: {
    marginBottom: 14,
    padding: 12,
    color: "#fecaca",
    background: "rgba(127, 29, 29, 0.32)",
    border: "1px solid rgba(248, 113, 113, 0.35)",
    borderRadius: 10,
  },
  success: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    padding: 12,
    color: "#bbf7d0",
    background: "rgba(20, 83, 45, 0.32)",
    border: "1px solid rgba(74, 222, 128, 0.3)",
    borderRadius: 10,
  },
  runButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: "100%",
    padding: "13px 16px",
    color: "white",
    fontWeight: 800,
    border: 0,
    borderRadius: 12,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    cursor: "pointer",
  },
  runButtonDisabled: { opacity: 0.65, cursor: "wait" },
  spinner: { animation: "spin 1s linear infinite" },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: "70vh",
    color: "#94a3b8",
    textAlign: "center",
  },
};