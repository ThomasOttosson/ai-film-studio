/**
 * Application router configuration.
 *
 * Placement:
 * frontend/src/app/router.tsx
 */

import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { EditorRoute } from "./routes/editor";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/editor" />,
  },
  {
    path: "/editor",
    element: <EditorRoute />,
  },
  {
    path: "*",
    element: <Navigate replace to="/editor" />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export { router };