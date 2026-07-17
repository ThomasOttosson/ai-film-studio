import { useMemo } from "react";
import {
  FiActivity,
  FiClock,
  FiFilm,
  FiImage,
  FiLock,
  FiMusic,
  FiRotateCw,
  FiSliders,
  FiType,
  FiVolume2,
  FiZap,
} from "react-icons/fi";

export type InspectorClipType = "video" | "audio" | "text" | "image" | "effect";

export interface InspectorTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface InspectorAudio {
  volume: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
}

export interface InspectorClip {
  id: string | number;
  name: string;
  type: InspectorClipType;
  start: number;
  duration: number;
  speed?: number;
  locked?: boolean;
  transform?: Partial<InspectorTransform>;
  audio?: Partial<InspectorAudio>;
  text?: string;
  fontSize?: number;
  textColor?: string;
}

export interface InspectorPanelProps {
  clip: InspectorClip | null;
  onChange?: (clip: InspectorClip) => void;
  onOpenAiActions?: (clip: InspectorClip) => void;
  disabled?: boolean;
  className?: string;
}

const defaultTransform: InspectorTransform = {
  x: 0,
  y: 0,
  scale: 100,
  rotation: 0,
  opacity: 100,
};

const defaultAudio: InspectorAudio = {
  volume: 100,
  fadeIn: 0,
  fadeOut: 0,
  muted: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label style={styles.fieldLabel}>
      <span style={styles.fieldName}>{label}</span>
      <span style={styles.numberWrap}>
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(
              typeof min === "number" && typeof max === "number"
                ? clamp(next, min, max)
                : typeof min === "number"
                  ? Math.max(min, next)
                  : typeof max === "number"
                    ? Math.min(max, next)
                    : next,
            );
          }}
          style={styles.numberInput}
        />
        {suffix ? <span style={styles.suffix}>{suffix}</span> : null}
      </span>
    </label>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>
        <span style={styles.sectionIcon}>{icon}</span>
        <span>{title}</span>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

function iconForType(type: InspectorClipType) {
  switch (type) {
    case "audio":
      return <FiMusic />;
    case "text":
      return <FiType />;
    case "image":
      return <FiImage />;
    case "effect":
      return <FiZap />;
    case "video":
    default:
      return <FiFilm />;
  }
}

export default function InspectorPanel({
  clip,
  onChange,
  onOpenAiActions,
  disabled = false,
  className,
}: InspectorPanelProps) {
  const transform = useMemo(
    () => ({ ...defaultTransform, ...(clip?.transform ?? {}) }),
    [clip?.transform],
  );

  const audio = useMemo(
    () => ({ ...defaultAudio, ...(clip?.audio ?? {}) }),
    [clip?.audio],
  );

  const updateClip = (patch: Partial<InspectorClip>) => {
    if (!clip || disabled || !onChange) return;
    onChange({ ...clip, ...patch });
  };

  const updateTransform = (patch: Partial<InspectorTransform>) => {
    updateClip({ transform: { ...transform, ...patch } });
  };

  const updateAudio = (patch: Partial<InspectorAudio>) => {
    updateClip({ audio: { ...audio, ...patch } });
  };

  if (!clip) {
    return (
      <aside className={className} style={styles.panel} aria-label="Inspector">
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <FiSliders />
          </div>
          <strong style={styles.emptyTitle}>Inget klipp markerat</strong>
          <p style={styles.emptyText}>
            Markera ett klipp i tidslinjen för att redigera dess egenskaper.
          </p>
        </div>
      </aside>
    );
  }

  const isVisual = clip.type === "video" || clip.type === "image" || clip.type === "text";
  const hasAudio = clip.type === "video" || clip.type === "audio";

  return (
    <aside className={className} style={styles.panel} aria-label="Inspector">
      <header style={styles.header}>
        <div style={styles.clipIdentity}>
          <span style={styles.clipTypeIcon}>{iconForType(clip.type)}</span>
          <div style={styles.clipIdentityText}>
            <span style={styles.eyebrow}>Inspector</span>
            <input
              aria-label="Klipnamn"
              value={clip.name}
              disabled={disabled}
              onChange={(event) => updateClip({ name: event.target.value })}
              style={styles.nameInput}
            />
          </div>
        </div>
        {clip.locked ? (
          <span style={styles.lockBadge} title="Klippet är låst">
            <FiLock /> Låst
          </span>
        ) : null}
      </header>

      <Section icon={<FiClock />} title="Timing">
        <div style={styles.twoColumnGrid}>
          <NumberField
            label="Start"
            value={clip.start}
            min={0}
            step={0.1}
            suffix="s"
            disabled={disabled || clip.locked}
            onChange={(start) => updateClip({ start })}
          />
          <NumberField
            label="Längd"
            value={clip.duration}
            min={0.1}
            step={0.1}
            suffix="s"
            disabled={disabled || clip.locked}
            onChange={(duration) => updateClip({ duration })}
          />
          <NumberField
            label="Hastighet"
            value={clip.speed ?? 1}
            min={0.1}
            max={8}
            step={0.1}
            suffix="×"
            disabled={disabled || clip.locked}
            onChange={(speed) => updateClip({ speed })}
          />
          <div style={styles.readOnlyField}>
            <span style={styles.fieldName}>Slut</span>
            <strong style={styles.readOnlyValue}>{(clip.start + clip.duration).toFixed(1)} s</strong>
          </div>
        </div>
      </Section>

      {isVisual ? (
        <Section icon={<FiRotateCw />} title="Transformering">
          <div style={styles.twoColumnGrid}>
            <NumberField
              label="Position X"
              value={transform.x}
              step={1}
              suffix="px"
              disabled={disabled || clip.locked}
              onChange={(x) => updateTransform({ x })}
            />
            <NumberField
              label="Position Y"
              value={transform.y}
              step={1}
              suffix="px"
              disabled={disabled || clip.locked}
              onChange={(y) => updateTransform({ y })}
            />
            <NumberField
              label="Skala"
              value={transform.scale}
              min={1}
              max={500}
              suffix="%"
              disabled={disabled || clip.locked}
              onChange={(scale) => updateTransform({ scale })}
            />
            <NumberField
              label="Rotation"
              value={transform.rotation}
              min={-360}
              max={360}
              suffix="°"
              disabled={disabled || clip.locked}
              onChange={(rotation) => updateTransform({ rotation })}
            />
          </div>

          <label style={styles.rangeLabel}>
            <span style={styles.rangeHeader}>
              <span>Opacitet</span>
              <strong>{Math.round(transform.opacity)}%</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={transform.opacity}
              disabled={disabled || clip.locked}
              onChange={(event) => updateTransform({ opacity: Number(event.target.value) })}
              style={styles.range}
            />
          </label>
        </Section>
      ) : null}

      {hasAudio ? (
        <Section icon={<FiVolume2 />} title="Ljud">
          <label style={styles.rangeLabel}>
            <span style={styles.rangeHeader}>
              <span>Volym</span>
              <strong>{audio.muted ? "Av" : `${Math.round(audio.volume)}%`}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={200}
              value={audio.volume}
              disabled={disabled || clip.locked || audio.muted}
              onChange={(event) => updateAudio({ volume: Number(event.target.value) })}
              style={styles.range}
            />
          </label>

          <label style={styles.toggleRow}>
            <span>Tysta klippet</span>
            <input
              type="checkbox"
              checked={audio.muted}
              disabled={disabled || clip.locked}
              onChange={(event) => updateAudio({ muted: event.target.checked })}
            />
          </label>

          <div style={styles.twoColumnGrid}>
            <NumberField
              label="Fade in"
              value={audio.fadeIn}
              min={0}
              max={clip.duration}
              step={0.1}
              suffix="s"
              disabled={disabled || clip.locked}
              onChange={(fadeIn) => updateAudio({ fadeIn })}
            />
            <NumberField
              label="Fade out"
              value={audio.fadeOut}
              min={0}
              max={clip.duration}
              step={0.1}
              suffix="s"
              disabled={disabled || clip.locked}
              onChange={(fadeOut) => updateAudio({ fadeOut })}
            />
          </div>
        </Section>
      ) : null}

      {clip.type === "text" ? (
        <Section icon={<FiType />} title="Text">
          <label style={styles.fieldLabel}>
            <span style={styles.fieldName}>Innehåll</span>
            <textarea
              value={clip.text ?? ""}
              rows={4}
              disabled={disabled || clip.locked}
              onChange={(event) => updateClip({ text: event.target.value })}
              style={styles.textarea}
            />
          </label>
          <div style={styles.twoColumnGrid}>
            <NumberField
              label="Storlek"
              value={clip.fontSize ?? 48}
              min={8}
              max={240}
              suffix="px"
              disabled={disabled || clip.locked}
              onChange={(fontSize) => updateClip({ fontSize })}
            />
            <label style={styles.colorField}>
              <span style={styles.fieldName}>Färg</span>
              <input
                type="color"
                value={clip.textColor ?? "#ffffff"}
                disabled={disabled || clip.locked}
                onChange={(event) => updateClip({ textColor: event.target.value })}
                style={styles.colorInput}
              />
            </label>
          </div>
        </Section>
      ) : null}

      <Section icon={<FiActivity />} title="AI-verktyg">
        <button
          type="button"
          disabled={disabled || !onOpenAiActions}
          onClick={() => onOpenAiActions?.(clip)}
          style={{
            ...styles.aiButton,
            ...(disabled || !onOpenAiActions ? styles.disabledButton : {}),
          }}
        >
          <FiZap />
          Öppna AI Actions
        </button>
        <p style={styles.helperText}>
          Generera B-roll, förbättra kvalitet, ta bort bakgrund eller ändra visuell stil.
        </p>
      </Section>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 18,
    background: "rgba(2, 6, 23, 0.72)",
    color: "#e2e8f0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
  },
  clipIdentity: { display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: 1 },
  clipTypeIcon: {
    display: "grid",
    placeItems: "center",
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 11,
    background: "linear-gradient(135deg, rgba(99,102,241,.28), rgba(236,72,153,.22))",
    color: "#c4b5fd",
  },
  clipIdentityText: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  eyebrow: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".14em",
    textTransform: "uppercase",
  },
  nameInput: {
    width: "100%",
    minWidth: 0,
    padding: "3px 0",
    border: 0,
    outline: 0,
    background: "transparent",
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 700,
  },
  lockBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 8px",
    borderRadius: 999,
    background: "rgba(245, 158, 11, .12)",
    color: "#fde68a",
    fontSize: 11,
    fontWeight: 700,
  },
  section: { padding: "15px 16px", borderBottom: "1px solid rgba(148,163,184,.12)" },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  sectionIcon: { display: "grid", placeItems: "center", color: "#a78bfa" },
  sectionBody: { display: "grid", gap: 12 },
  twoColumnGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  fieldLabel: { display: "grid", gap: 6, minWidth: 0 },
  fieldName: { color: "#94a3b8", fontSize: 11, fontWeight: 600 },
  numberWrap: { position: "relative", display: "flex", alignItems: "center" },
  numberInput: {
    width: "100%",
    minWidth: 0,
    height: 34,
    padding: "0 32px 0 9px",
    border: "1px solid rgba(148,163,184,.2)",
    borderRadius: 9,
    outline: 0,
    background: "rgba(15,23,42,.76)",
    color: "#f8fafc",
    fontSize: 12,
    fontVariantNumeric: "tabular-nums",
  },
  suffix: { position: "absolute", right: 9, color: "#64748b", fontSize: 11, pointerEvents: "none" },
  readOnlyField: { display: "grid", gap: 6 },
  readOnlyValue: {
    display: "flex",
    alignItems: "center",
    height: 34,
    padding: "0 9px",
    border: "1px solid rgba(148,163,184,.12)",
    borderRadius: 9,
    background: "rgba(15,23,42,.4)",
    color: "#94a3b8",
    fontSize: 12,
  },
  rangeLabel: { display: "grid", gap: 7 },
  rangeHeader: { display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 11 },
  range: { width: "100%", accentColor: "#8b5cf6" },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 10px",
    border: "1px solid rgba(148,163,184,.16)",
    borderRadius: 9,
    background: "rgba(15,23,42,.55)",
    color: "#cbd5e1",
    fontSize: 12,
  },
  textarea: {
    width: "100%",
    resize: "vertical",
    padding: 10,
    border: "1px solid rgba(148,163,184,.2)",
    borderRadius: 9,
    outline: 0,
    background: "rgba(15,23,42,.76)",
    color: "#f8fafc",
    fontFamily: "inherit",
    fontSize: 12,
    lineHeight: 1.5,
  },
  colorField: { display: "grid", gap: 6 },
  colorInput: {
    width: "100%",
    height: 34,
    padding: 3,
    border: "1px solid rgba(148,163,184,.2)",
    borderRadius: 9,
    background: "rgba(15,23,42,.76)",
  },
  aiButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    minHeight: 40,
    padding: "0 13px",
    border: 0,
    borderRadius: 11,
    cursor: "pointer",
    background: "linear-gradient(135deg, #6366f1, #d946ef)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
  },
  disabledButton: { cursor: "not-allowed", opacity: 0.45 },
  helperText: { margin: 0, color: "#64748b", fontSize: 11, lineHeight: 1.5 },
  emptyState: {
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    minHeight: 320,
    padding: 30,
    textAlign: "center",
  },
  emptyIcon: {
    display: "grid",
    placeItems: "center",
    width: 52,
    height: 52,
    marginBottom: 13,
    borderRadius: 15,
    background: "rgba(99,102,241,.13)",
    color: "#a78bfa",
    fontSize: 23,
  },
  emptyTitle: { color: "#e2e8f0", fontSize: 14 },
  emptyText: { maxWidth: 230, margin: "8px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.55 },
};