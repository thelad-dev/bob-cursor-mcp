import path from "node:path";

export type BobChatMode = "plan" | "code" | "advanced" | "ask";

export const BOB_CHAT_MODES = ["plan", "code", "advanced", "ask"] as const satisfies readonly BobChatMode[];

export const DEFAULT_BOB_CHAT_MODE: BobChatMode = "advanced";

export function getDefaultChatMode(): BobChatMode {
  const raw = process.env.BOB_DEFAULT_CHAT_MODE?.trim();
  if (!raw) {
    return DEFAULT_BOB_CHAT_MODE;
  }
  if ((BOB_CHAT_MODES as readonly string[]).includes(raw)) {
    return raw as BobChatMode;
  }
  throw new Error(
    `BOB_DEFAULT_CHAT_MODE must be one of: ${BOB_CHAT_MODES.join(", ")}`,
  );
}

export function getBobBin(): string {
  return process.env.BOB_BIN?.trim() || "bob";
}

export function getDefaultWorkspace(): string {
  return (
    process.env.BOB_DEFAULT_WORKSPACE?.trim() ||
    process.env.CURSOR_PROJECT_DIR?.trim() ||
    process.cwd()
  );
}

export function getBobTimeoutMs(): number {
  const raw = process.env.BOB_TIMEOUT_MS?.trim();
  if (!raw) {
    return 600_000;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("BOB_TIMEOUT_MS must be a positive integer.");
  }
  return parsed;
}

export function resolveWorkspace(workspace?: string): string {
  const resolved = path.resolve(workspace?.trim() || getDefaultWorkspace());
  return resolved;
}

export function hasBobApiKey(): boolean {
  return Boolean(process.env.BOBSHELL_API_KEY?.trim());
}

export const AUTH_SETUP_HINT =
  "Set BOBSHELL_API_KEY in .cursor/mcp.json (env) or your shell. See README.md.";
