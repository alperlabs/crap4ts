export enum CliMode {
  Help = "HELP",
  AllSrc = "ALL_SRC",
  ChangedSrc = "CHANGED_SRC",
  ExplicitFiles = "EXPLICIT_FILES",
}

export interface CliArguments {
  mode: CliMode;
  fileArgs: string[];
}
