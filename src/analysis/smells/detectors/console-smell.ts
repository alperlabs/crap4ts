import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";
import { callReceiverName } from "./call-name.js";

/** `console.*` calls. */
export const consoleSmell: SmellDetector = {
  key: "consoleCalls",
  label: "console",
  category: "style",
  weight: 2,
  advice: "Route output through a logger, or delete the debug statement.",
  matches(node) {
    return ts.isCallExpression(node) && callReceiverName(node) === "console";
  },
};
