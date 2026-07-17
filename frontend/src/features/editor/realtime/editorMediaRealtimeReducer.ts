/**
 * Immutable reducer helpers for applying editor media realtime events.
 *
 * Placement:
 * frontend/src/features/editor/realtime/editorMediaRealtimeReducer.ts
 */

import type {
  EditorMediaRealtimeAsset,
  EditorMediaRealtimePayloadMap,
} from "./editorMediaRealtimePayloads";

export interface EditorMediaRealtimeState {
  assets: EditorMediaRealtimeAsset[];
  activeJobs: Record<string, EditorMediaRealtimeJobState>;
}

export interface EditorMediaRealtimeJobState {
  jobId: string;
  action?: string;
  progress: number;
  message?: string;
  status: "running" | "completed" | "failed";
  error?: string;
}

export type EditorMediaRealtimeReducerAction = {
  [TType in keyof EditorMediaRealtimePayloadMap]: {
    type: TType;
    payload: EditorMediaRealtimePayloadMap[TType];
  };
}[keyof EditorMediaRealtimePayloadMap];

export const initialEditorMediaRealtimeState: EditorMediaRealtimeState = {
  assets: [],
  activeJobs: {},
};

function upsertAsset(
  assets: EditorMediaRealtimeAsset[],
  asset: EditorMediaRealtimeAsset,
): EditorMediaRealtimeAsset[] {
  const index = assets.findIndex((candidate) => candidate.id === asset.id);

  if (index === -1) {
    return [asset, ...assets];
  }

  return assets.map((candidate, candidateIndex) =>
    candidateIndex === index ? { ...candidate, ...asset } : candidate,
  );
}

export function editorMediaRealtimeReducer(
  state: EditorMediaRealtimeState,
  action: EditorMediaRealtimeReducerAction,
): EditorMediaRealtimeState {
  switch (action.type) {
    case "media.created":
    case "media.updated":
      return {
        ...state,
        assets: upsertAsset(state.assets, action.payload.asset),
      };

    case "media.deleted":
      return {
        ...state,
        assets: state.assets.filter(
          (asset) => asset.id !== action.payload.assetId,
        ),
      };

    case "job.started":
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.payload.jobId]: {
            jobId: action.payload.jobId,
            action: action.payload.action,
            progress: action.payload.progress ?? 0,
            status: "running",
          },
        },
      };

    case "job.progress": {
      const current = state.activeJobs[action.payload.jobId];

      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.payload.jobId]: {
            jobId: action.payload.jobId,
            action: current?.action,
            progress: action.payload.progress,
            message: action.payload.message,
            status: "running",
          },
        },
      };
    }

    case "job.completed": {
      const current = state.activeJobs[action.payload.jobId];
      const assets = action.payload.asset
        ? upsertAsset(state.assets, action.payload.asset)
        : state.assets;

      return {
        assets,
        activeJobs: {
          ...state.activeJobs,
          [action.payload.jobId]: {
            jobId: action.payload.jobId,
            action: current?.action,
            progress: 100,
            status: "completed",
          },
        },
      };
    }

    case "job.failed": {
      const current = state.activeJobs[action.payload.jobId];

      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.payload.jobId]: {
            jobId: action.payload.jobId,
            action: current?.action,
            progress: current?.progress ?? 0,
            status: "failed",
            error: action.payload.error,
          },
        },
      };
    }

    case "ping":
    case "pong":
      return state;

    default:
      return state;
  }
}