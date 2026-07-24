import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";
import { callReceiverName } from "./call-name.js";

/** `console.*` calls. */
export const consoleSmell: SmellDetector = {
  key: "consoleCalls",
  label: "console",
  weight: 2,
  matches(node) {
    return ts.isCallExpression(node) && callReceiverName(node) === "console";
  },
};
