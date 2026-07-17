/**
 * Placement:
 * frontend/src/features/editor/deployment.public.test.ts
 *
 * Public deployment entrypoint contract tests.
 */

import { describe, expect, it } from "vitest";

import {
  getEditorDeploymentMetadata,
  type EditorDeploymentMetadata,
} from "./deployment.public";

describe("deployment public entrypoint", () => {
  it("exports the deployment metadata factory", () => {
    const metadata: EditorDeploymentMetadata =
      getEditorDeploymentMetadata();

    expect(metadata.ready).toBe(true);
    expect(metadata.stability).toBe("stable");
  });

  it("returns a frozen deployment snapshot", () => {
    expect(Object.isFrozen(getEditorDeploymentMetadata())).toBe(true);
  });
});