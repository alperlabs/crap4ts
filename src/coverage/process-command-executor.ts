import { spawn } from "node:child_process";
import type { CommandExecutor } from "./command-executor.js";

/** Runs commands as real child processes, inheriting stdio. */
export class ProcessCommandExecutor implements CommandExecutor {
  run(command: string[], directory: string): Promise<number> {
    const [program, ...args] = command;
    if (program === undefined) {
      return Promise.reject(new Error("Empty coverage command"));
    }
    return new Promise((resolve, reject) => {
      const child = spawn(program, args, {
        cwd: directory,
        stdio: "inherit",
        shell: false,
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
  }
}
