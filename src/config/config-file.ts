import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  REPORT_FORMAT_NAMES,
  type ConfigOverrides,
  type CoverageMode,
  type ReportFormatName,
} from "./crap-config.js";
import { isRecord } from "../shared/records.js";

/** Default config file name, looked up at the project root. */
export const CONFIG_FILE_NAME = "crap4ts.config.json";

/** package.json key that may hold the same settings inline. */
export const PACKAGE_JSON_KEY = "crap4ts";

/**
 * Load configuration overrides for a project.
 *
 * Sources, in priority order: an explicit `--config` path (must exist), then
 * `crap4ts.config.json` at the project root, then a `crap4ts` key in the
 * project's package.json. Settings are validated strictly — an unknown key or
 * a wrong type is a usage error, not a silent fallback.
 */
export function loadConfigOverrides(
  projectRoot: string,
  explicitPath: string | null,
): ConfigOverrides {
  const source = configSource(projectRoot, explicitPath);
  if (source === null) {
    return {};
  }
  return parseOverrides(source.settings, source.label);
}

interface ConfigSource {
  settings: Record<string, unknown>;
  label: string;
}

function configSource(projectRoot: string, explicitPath: string | null): ConfigSource | null {
  if (explicitPath !== null) {
    return explicitSource(path.resolve(projectRoot, explicitPath));
  }
  const defaultPath = path.join(projectRoot, CONFIG_FILE_NAME);
  if (existsSync(defaultPath)) {
    return { settings: readJsonObject(defaultPath), label: CONFIG_FILE_NAME };
  }
  return packageJsonSource(projectRoot);
}

function explicitSource(configPath: string): ConfigSource {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return { settings: readJsonObject(configPath), label: path.basename(configPath) };
}

function packageJsonSource(projectRoot: string): ConfigSource | null {
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  const settings = readJsonObject(packageJsonPath)[PACKAGE_JSON_KEY];
  if (!isRecord(settings) || Array.isArray(settings)) {
    return null;
  }
  return { settings, label: `package.json#${PACKAGE_JSON_KEY}` };
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const parsed: unknown = parseJson(readFileSync(filePath, "utf8"), filePath);
  if (!isRecord(parsed) || Array.isArray(parsed)) {
    throw new Error(`Config must be a JSON object: ${filePath}`);
  }
  return parsed;
}

function parseJson(text: string, filePath: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Config is not valid JSON: ${filePath}`);
  }
}

/**
 * One config-file field: its JSON key and how its value becomes overrides.
 * Adding a setting means adding an entry here — parsing and validation both
 * iterate this registry.
 */
interface ConfigField {
  key: string;
  parse(value: unknown): ConfigOverrides;
}

const CONFIG_FIELDS: readonly ConfigField[] = [
  { key: "threshold", parse: (value) => ({ threshold: positiveNumber(value, "threshold") }) },
  { key: "format", parse: (value) => ({ format: formatName(value) }) },
  { key: "coverage", parse: (value) => ({ coverageMode: coverageMode(value) }) },
  { key: "coverageCommand", parse: (value) => ({ coverageCommand: command(value) }) },
  {
    key: "coverageFile",
    parse: (value) => ({ coverageFile: text(value, "coverageFile"), coverageMode: "file" }),
  },
  { key: "coverageFormat", parse: (value) => ({ coverageFormat: text(value, "coverageFormat") }) },
  { key: "sourceRoots", parse: (value) => ({ sourceRoots: textList(value, "sourceRoots") }) },
  { key: "baseline", parse: (value) => ({ baselineFile: text(value, "baseline") }) },
];

function parseOverrides(settings: Record<string, unknown>, label: string): ConfigOverrides {
  const overrides: ConfigOverrides = {};
  for (const [key, value] of Object.entries(settings)) {
    Object.assign(overrides, fieldFor(key, label).parse(value));
  }
  return overrides;
}

function fieldFor(key: string, label: string): ConfigField {
  const field = CONFIG_FIELDS.find((candidate) => candidate.key === key);
  if (field === undefined) {
    const known = CONFIG_FIELDS.map((candidate) => candidate.key).join(", ");
    throw new Error(`Unknown config key "${key}" in ${label} (known: ${known})`);
  }
  return field;
}

function positiveNumber(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Config "${key}" must be a positive number`);
  }
  return value;
}

function formatName(value: unknown): ReportFormatName {
  const known = REPORT_FORMAT_NAMES.find((name) => name === value);
  if (known === undefined) {
    throw new Error(`Config "format" must be one of: ${REPORT_FORMAT_NAMES.join(", ")}`);
  }
  return known;
}

const COVERAGE_MODES: readonly CoverageMode[] = ["run", "file", "off"];

function coverageMode(value: unknown): CoverageMode {
  const known = COVERAGE_MODES.find((mode) => mode === value);
  if (known === undefined) {
    throw new Error(`Config "coverage" must be one of: ${COVERAGE_MODES.join(", ")}`);
  }
  return known;
}

/** A command is either a full string (split on whitespace) or an argv list. */
function command(value: unknown): readonly string[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().split(/\s+/);
  }
  return textList(value, "coverageCommand");
}

function text(value: unknown, key: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Config "${key}" must be a non-empty string`);
  }
  return value;
}

function textList(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isNonEmptyString)) {
    throw new Error(`Config "${key}" must be a non-empty array of strings`);
  }
  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
