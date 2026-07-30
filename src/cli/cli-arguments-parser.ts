import type { AnalyzeArguments, CliArguments, FileSelection } from "./cli-mode.js";
import {
  REPORT_FORMAT_NAMES,
  type ConfigOverrides,
  type ReportFormatName,
} from "../config/crap-config.js";

/** Mutable parse state that {@link CliOption.apply} writes into. */
interface Draft {
  changed: boolean;
  changedSinceRef: string | null;
  files: string[];
  overrides: ConfigOverrides;
  configPath: string | null;
  writeBaseline: boolean;
  sourceRoots: string[];
}

/**
 * One CLI option: its flag, whether it consumes a value, and how it updates
 * the draft. Adding an option means adding an entry to {@link CLI_OPTIONS} —
 * parsing, validation, and unknown-flag rejection all iterate this registry.
 */
interface CliOption {
  flag: string;
  /** Value placeholder for error messages; null marks a boolean flag. */
  valueName: string | null;
  apply(draft: Draft, value: string): void;
}

const CLI_OPTIONS: readonly CliOption[] = [
  { flag: "--changed", valueName: null, apply: (draft) => (draft.changed = true) },
  {
    flag: "--changed-since",
    valueName: "<ref>",
    apply: (draft, value) => (draft.changedSinceRef = value),
  },
  {
    flag: "--threshold",
    valueName: "<score>",
    apply: (draft, value) => (draft.overrides.threshold = threshold(value)),
  },
  {
    flag: "--format",
    valueName: "<name>",
    apply: (draft, value) => (draft.overrides.format = formatName(value)),
  },
  {
    flag: "--no-coverage",
    valueName: null,
    apply: (draft) => (draft.overrides.coverageMode = "off"),
  },
  {
    flag: "--coverage-file",
    valueName: "<path>",
    apply: (draft, value) => {
      draft.overrides.coverageMode = "file";
      draft.overrides.coverageFile = value;
    },
  },
  {
    flag: "--coverage-command",
    valueName: "<command>",
    apply: (draft, value) => (draft.overrides.coverageCommand = splitCommand(value)),
  },
  {
    flag: "--coverage-format",
    valueName: "<name>",
    apply: (draft, value) => (draft.overrides.coverageFormat = value),
  },
  {
    flag: "--source-root",
    valueName: "<dir>",
    apply: (draft, value) => draft.sourceRoots.push(value),
  },
  {
    flag: "--baseline",
    valueName: "<path>",
    apply: (draft, value) => (draft.overrides.baselineFile = value),
  },
  {
    flag: "--write-baseline",
    valueName: null,
    apply: (draft) => (draft.writeBaseline = true),
  },
  {
    flag: "--config",
    valueName: "<path>",
    apply: (draft, value) => (draft.configPath = value),
  },
];

/**
 * Parse raw argv into a command, file selection, and configuration
 * overrides. Throws on invalid usage (unknown flags, missing values, or
 * conflicting selections such as `--changed` combined with explicit files).
 */
export function parseCliArguments(args: string[]): CliArguments {
  if (args.includes("--help")) {
    return { command: "help" };
  }
  if (args.includes("--version")) {
    return { command: "version" };
  }
  return resolve(consumeArgs(args));
}

function consumeArgs(args: string[]): Draft {
  const draft: Draft = {
    changed: false,
    changedSinceRef: null,
    files: [],
    overrides: {},
    configPath: null,
    writeBaseline: false,
    sourceRoots: [],
  };
  let skipNext = false;
  for (const [index, arg] of args.entries()) {
    if (skipNext) {
      skipNext = false;
    } else {
      skipNext = consumeArg(draft, arg, args[index + 1]);
    }
  }
  return draft;
}

/** Consume one argument; true when the next argument was used as its value. */
function consumeArg(draft: Draft, arg: string, next: string | undefined): boolean {
  if (!isFlag(arg)) {
    draft.files.push(arg);
    return false;
  }
  const option = optionFor(arg);
  if (option.valueName === null) {
    option.apply(draft, "");
    return false;
  }
  option.apply(draft, valueFor(option.flag, option.valueName, next));
  return true;
}

function optionFor(flag: string): CliOption {
  const option = CLI_OPTIONS.find((candidate) => candidate.flag === flag);
  if (option === undefined) {
    throw new Error(`Unknown option: ${flag}`);
  }
  return option;
}

function valueFor(flag: string, valueName: string, next: string | undefined): string {
  if (next === undefined || isFlag(next)) {
    throw new Error(`${flag} requires a value ${valueName}`);
  }
  return next;
}

function resolve(draft: Draft): AnalyzeArguments {
  if (draft.sourceRoots.length > 0) {
    draft.overrides.sourceRoots = draft.sourceRoots;
  }
  return {
    command: "analyze",
    selection: selectionOf(draft),
    overrides: draft.overrides,
    configPath: draft.configPath,
    writeBaseline: draft.writeBaseline,
  };
}

function selectionOf(draft: Draft): FileSelection {
  rejectConflictingSelections(draft);
  if (draft.changed) {
    return { kind: "changed" };
  }
  if (draft.changedSinceRef !== null) {
    return { kind: "changed-since", ref: draft.changedSinceRef };
  }
  if (draft.files.length > 0) {
    return { kind: "files", paths: draft.files };
  }
  return { kind: "all" };
}

function rejectConflictingSelections(draft: Draft): void {
  const selections = [draft.changed, draft.changedSinceRef !== null, draft.files.length > 0].filter(
    Boolean,
  ).length;
  if (selections > 1) {
    throw new Error("--changed, --changed-since, and file arguments are mutually exclusive");
  }
}

function threshold(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--threshold must be a positive number, got: ${value}`);
  }
  return parsed;
}

function formatName(value: string): ReportFormatName {
  const known = REPORT_FORMAT_NAMES.find((name) => name === value);
  if (known === undefined) {
    throw new Error(`--format must be one of: ${REPORT_FORMAT_NAMES.join(", ")}`);
  }
  return known;
}

function splitCommand(value: string): string[] {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new Error("--coverage-command must not be empty");
  }
  return parts;
}

function isFlag(arg: string): boolean {
  return arg.startsWith("--");
}
