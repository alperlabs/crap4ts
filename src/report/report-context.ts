import type { MethodMetrics } from "../analysis/method-metrics.js";
import type { ReportFormatName } from "../config/crap-config.js";

/** Presentation inputs shared by every report renderer. */
export interface ReportContext {
  /** Root used to relativize file paths in the output. */
  projectRoot: string;
  /** CRAP gate; renderers may highlight methods above it. */
  threshold: number;
}

/**
 * Renders analyzed metrics into one output format. Renderers are registered
 * in `registry.ts`; adding a format means implementing this interface in its
 * own file and adding it to the list.
 */
export interface ReportRenderer {
  readonly name: ReportFormatName;
  render(metrics: MethodMetrics[], context: ReportContext): string;
}
