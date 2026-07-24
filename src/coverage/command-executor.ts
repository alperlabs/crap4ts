/** Runs an external command in a directory and returns its exit code. */
export interface CommandExecutor {
  run(command: string[], directory: string): Promise<number>;
}
