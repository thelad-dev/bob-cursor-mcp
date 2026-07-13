import { spawn } from "node:child_process";
import path from "node:path";
import {
  AUTH_SETUP_HINT,
  getBobBin,
  getBobTimeoutMs,
  getDefaultChatMode,
  hasBobApiKey,
  resolveWorkspace,
  type BobChatMode,
} from "./config.js";

export class BobRunnerError extends Error {
  readonly exitCode?: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(
    message: string,
    options: { exitCode?: number; stdout?: string; stderr?: string } = {},
  ) {
    super(message);
    this.name = "BobRunnerError";
    this.exitCode = options.exitCode;
    this.stdout = options.stdout ?? "";
    this.stderr = options.stderr ?? "";
  }
}

export interface RunBobOptions {
  args: string[];
  workspace?: string;
  stdin?: string;
  requireApiKey?: boolean;
  jsonOutput?: boolean;
}

let runChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = runChain.then(task, task);
  runChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function detectAuthFailure(stdout: string, stderr: string): string | null {
  const combined = `${stdout}\n${stderr}`;
  if (
    /Bob Authentication Required/i.test(combined) ||
    /Authentication timeout/i.test(combined) ||
    /Failed to exchange code for tokens/i.test(combined)
  ) {
    return AUTH_SETUP_HINT;
  }
  return null;
}

function formatBobOutput(stdout: string, stderr: string, jsonOutput: boolean): string {
  const trimmedStdout = stdout.trim();
  const trimmedStderr = stderr.trim();

  if (jsonOutput && trimmedStdout) {
    try {
      const parsed = JSON.parse(trimmedStdout) as unknown;
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Fall through to raw output when Bob did not emit valid JSON.
    }
  }

  const parts = [trimmedStdout, trimmedStderr].filter(Boolean);
  return parts.join("\n\n").trim() || "(no output)";
}

async function runBobProcess(options: RunBobOptions): Promise<string> {
  if (options.requireApiKey && !hasBobApiKey()) {
    throw new BobRunnerError(
      `BOBSHELL_API_KEY is not configured. ${AUTH_SETUP_HINT}`,
    );
  }

  const bobBin = getBobBin();
  const cwd = resolveWorkspace(options.workspace);
  const timeoutMs = getBobTimeoutMs();

  return new Promise((resolve, reject) => {
    const child = spawn(bobBin, options.args, {
      cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      reject(
        new BobRunnerError(
          `Bob timed out after ${timeoutMs}ms. Increase BOB_TIMEOUT_MS if needed.`,
          { stdout, stderr },
        ),
      );
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(
        new BobRunnerError(
          `Failed to start Bob (${bobBin}): ${error.message}. Check BOB_BIN.`,
          { stdout, stderr },
        ),
      );
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      const authHint = detectAuthFailure(stdout, stderr);
      if (authHint) {
        reject(
          new BobRunnerError(`Bob authentication failed. ${authHint}`, {
            exitCode: code ?? undefined,
            stdout,
            stderr,
          }),
        );
        return;
      }

      if (code !== 0) {
        reject(
          new BobRunnerError(
            `Bob exited with code ${code ?? "unknown"}.`,
            { exitCode: code ?? undefined, stdout, stderr },
          ),
        );
        return;
      }

      resolve(formatBobOutput(stdout, stderr, options.jsonOutput ?? false));
    });

    if (options.stdin) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

export async function runBob(options: RunBobOptions): Promise<string> {
  return enqueue(() => runBobProcess(options));
}

export interface BobPromptOptions {
  prompt: string;
  mode?: BobChatMode;
  workspace?: string;
  includeDirectories?: string[];
  model?: string;
  stdin?: string;
}

export async function runBobPrompt(options: BobPromptOptions): Promise<string> {
  const args = [
    "--accept-license",
    `--chat-mode=${options.mode ?? getDefaultChatMode()}`,
    "--approval-mode=auto_edit",
    "--hide-intermediary-output",
    "-o",
    "json",
  ];

  if (options.model?.trim()) {
    args.push("-m", options.model.trim());
  }

  for (const directory of options.includeDirectories ?? []) {
    const trimmed = directory.trim();
    if (trimmed) {
      args.push("--include-directories", path.resolve(trimmed));
    }
  }

  args.push(options.prompt);

  return runBob({
    args,
    workspace: options.workspace,
    stdin: options.stdin,
    requireApiKey: true,
    jsonOutput: true,
  });
}

export async function runBobVersion(): Promise<string> {
  return runBob({ args: ["--version"] });
}

export async function runBobListSessions(workspace?: string): Promise<string> {
  return runBob({
    args: ["--list-sessions"],
    workspace,
    requireApiKey: false,
  });
}

export interface BobResumeSessionOptions {
  session: string;
  prompt: string;
  mode?: BobChatMode;
  workspace?: string;
  includeDirectories?: string[];
  model?: string;
  stdin?: string;
}

export async function runBobResumeSession(
  options: BobResumeSessionOptions,
): Promise<string> {
  const args = [
    "--accept-license",
    `--resume=${options.session.trim()}`,
    `--chat-mode=${options.mode ?? getDefaultChatMode()}`,
    "--approval-mode=auto_edit",
    "--hide-intermediary-output",
    "-o",
    "json",
  ];

  if (options.model?.trim()) {
    args.push("-m", options.model.trim());
  }

  for (const directory of options.includeDirectories ?? []) {
    const trimmed = directory.trim();
    if (trimmed) {
      args.push("--include-directories", path.resolve(trimmed));
    }
  }

  args.push(options.prompt);

  return runBob({
    args,
    workspace: options.workspace,
    stdin: options.stdin,
    requireApiKey: true,
    jsonOutput: true,
  });
}
