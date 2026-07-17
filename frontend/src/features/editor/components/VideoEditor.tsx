/**
 * Video editor composition root.
 *
 * Placement:
 * frontend/src/features/editor/components/VideoEditor.tsx
 */

import { useMemo, type ReactNode } from "react";

import {
  TimelineProvider,
  createEmptyTimelineProject,
} from "../state/TimelineProvider";
import type { TimelineProject } from "../types/timeline";
import { Timeline } from "./Timeline";
import { TimelineControls } from "./TimelineControls";

export interface VideoEditorProps {
  project?: TimelineProject;
  mediaPanel?: ReactNode;
  inspectorPanel?: ReactNode;
  preview?: ReactNode;
  topBar?: ReactNode;
}

function DefaultPreview() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-black">
      <div
        aria-label="Video preview"
        className="relative aspect-video max-h-full w-full max-w-5xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl"
        role="img"
      >
        <div className="absolute inset-0 grid place-items-center">
          <p className="text-sm text-neutral-500">
            Preview renderer not connected
          </p>
        </div>
      </div>
    </div>
  );
}

function DefaultMediaPanel() {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-neutral-800 bg-neutral-950">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-100">
          Media
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 place-items-center p-4">
        <p className="max-w-48 text-center text-xs leading-5 text-neutral-500">
          Imported media and AI-generated assets will appear here.
        </p>
      </div>
    </aside>
  );
}

function DefaultInspectorPanel() {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-neutral-950">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-100">
          Inspector
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 place-items-center p-4">
        <p className="max-w-48 text-center text-xs leading-5 text-neutral-500">
          Select a clip to edit its properties.
        </p>
      </div>
    </aside>
  );
}

function DefaultTopBar({
  project,
}: {
  project: TimelineProject;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 text-neutral-100">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold">
          {project.name}
        </h1>
        <p className="text-[10px] text-neutral-500">
          {project.width} × {project.height} · {project.fps} fps
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full border border-neutral-700 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-400">
          Draft
        </span>

        <button
          className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-950 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          type="button"
        >
          Export
        </button>
      </div>
    </header>
  );
}

function VideoEditorWorkspace({
  mediaPanel,
  inspectorPanel,
  preview,
  topBar,
}: Omit<VideoEditorProps, "project">) {
  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-900 text-neutral-100">
      {topBar}

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_280px]">
        {mediaPanel}

        <section className="min-h-0 min-w-0 bg-neutral-900 p-4">
          {preview}
        </section>

        {inspectorPanel}
      </div>

      <div className="h-[340px] shrink-0">
        <TimelineControls />
        <div className="h-[calc(100%-3rem)]">
          <Timeline />
        </div>
      </div>
    </main>
  );
}

export function VideoEditor({
  project,
  mediaPanel,
  inspectorPanel,
  preview,
  topBar,
}: VideoEditorProps) {
  const initialProject = useMemo(
    () => project ?? createEmptyTimelineProject(),
    [project],
  );

  return (
    <TimelineProvider initialProject={initialProject}>
      <VideoEditorWorkspace
        inspectorPanel={
          inspectorPanel ?? <DefaultInspectorPanel />
        }
        mediaPanel={mediaPanel ?? <DefaultMediaPanel />}
        preview={preview ?? <DefaultPreview />}
        topBar={
          topBar ?? <DefaultTopBar project={initialProject} />
        }
      />
    </TimelineProvider>
  );
}