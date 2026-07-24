import { describe, it, expect } from "vitest";
import { ProcessCommandExecutor } from "../../src/coverage/process-command-executor.js";

// This adapter is excluded from coverage thresholds (it is a thin spawn wrapper),
// but we still smoke-test both outcomes for confidence.
describe("ProcessCommandExecutor", () => {
  const executor = new ProcessCommandExecutor();

  it("resolves with the child's exit code", async () => {
    // when
    const success = await executor.run(["node", "-e", "process.exit(0)"], process.cwd());
    const failure = await executor.run(["node", "-e", "process.exit(3)"], process.cwd());

    // then
    expect(success).toBe(0);
    expect(failure).toBe(3);
  });

  it("rejects when the program cannot be spawned", async () => {
    // when
    const act = executor.run(["crap4ts-nonexistent-binary-xyz"], process.cwd());

    // then
    await expect(act).rejects.toBeInstanceOf(Error);
  });
});
