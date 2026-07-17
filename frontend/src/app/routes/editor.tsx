/**
 * Lazy-loadable application route for the editor workspace.
 *
 * Placement:
 * frontend/src/app/routes/editor.tsx
 */

import React, {
  Suspense,
  lazy,
  type ReactNode,
} from "react";

const EditorPage = lazy(async () => {
  const module = await import(
    "../../features/editor/pages/EditorPage"
  );

  return {
    default: module.EditorPage,
  };
});

export interface EditorRouteProps {
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
}

interface EditorRouteErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface EditorRouteErrorBoundaryState {
  hasError: boolean;
}

class EditorRouteErrorBoundary extends React.Component<
  EditorRouteErrorBoundaryProps,
  EditorRouteErrorBoundaryState
> {
  state: EditorRouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): EditorRouteErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function DefaultLoadingFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-950 text-neutral-100">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-100"
        />
        <p className="mt-3 text-sm text-neutral-400">
          Loading editor…
        </p>
      </div>
    </main>
  );
}

function DefaultErrorFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-neutral-100">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">
          Editor unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          The editor could not be loaded. Refresh the page
          and try again.
        </p>
        <button
          className="mt-5 rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload editor
        </button>
      </div>
    </main>
  );
}

export function EditorRoute({
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback = <DefaultErrorFallback />,
}: EditorRouteProps) {
  return (
    <EditorRouteErrorBoundary
      fallback={errorFallback}
    >
      <Suspense fallback={loadingFallback}>
        <EditorPage />
      </Suspense>
    </EditorRouteErrorBoundary>
  );
}

export default EditorRoute;