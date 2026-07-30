import type { ReportFormatName } from "../config/crap-config.js";
import type { ReportRenderer } from "./report-context.js";
import { textRenderer } from "./report-formatter.js";
import { jsonRenderer } from "./json-formatter.js";
import { githubRenderer } from "./github-formatter.js";

/**
 * The active set of report renderers. To add a format, implement a
 * {@link ReportRenderer} in its own file, add it here, and add its name to
 * {@link ReportFormatName}.
 */
export const REPORT_RENDERERS: readonly ReportRenderer[] = [
  textRenderer,
  jsonRenderer,
  githubRenderer,
];

/** The renderer registered under `name`. */
export function rendererNamed(name: ReportFormatName): ReportRenderer {
  const renderer = REPORT_RENDERERS.find((candidate) => candidate.name === name);
  if (renderer === undefined) {
    throw new Error(`Unknown report format: ${name}`);
  }
  return renderer;
}
