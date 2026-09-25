import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Component tests each call render(); without this, DOM from one test
// leaks into the next and getByRole starts finding duplicates.
afterEach(() => {
  cleanup();
});
