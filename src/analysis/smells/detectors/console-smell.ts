import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";
import { callReceiverName } from "./call-name.js";

/** `console.*` calls. */
export const consoleSmell: SmellDetector = {
  key: "consoleCalls",
  label: "console",
  weight: 2,
  count(node) {
    return booleanSmell(ts.isCallExpression(node) && callReceiverName(node) === "console");
  },
};
