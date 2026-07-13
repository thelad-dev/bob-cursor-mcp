import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BobRunnerError, runBobPrompt } from "../bob-runner.js";
import { BOB_CHAT_MODES, getDefaultChatMode } from "../config.js";
import type { BobChatMode } from "../config.js";

const bobPromptSchema = {
  prompt: z.string().min(1).describe("Task or question for IBM Bob Shell."),
  mode: z
    .enum(BOB_CHAT_MODES)
    .default(getDefaultChatMode())
    .describe("Bob chat mode: plan, code, advanced, or ask."),
  workspace: z
    .string()
    .optional()
    .describe("Working directory for Bob. Defaults to the Cursor project root."),
  include_directories: z
    .array(z.string())
    .optional()
    .describe("Additional directories Bob may include in its workspace."),
  model: z.string().optional().describe("Optional Bob model override (-m)."),
  stdin: z
    .string()
    .optional()
    .describe("Optional stdin content piped into Bob alongside the prompt."),
};

function toolError(error: unknown) {
  if (error instanceof BobRunnerError) {
    const details = [error.message, error.stdout, error.stderr]
      .filter(Boolean)
      .join("\n\n");
    return {
      isError: true as const,
      content: [{ type: "text" as const, text: details }],
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function registerPromptTools(server: McpServer): void {
  server.registerTool(
    "bob_prompt",
    {
      description:
        "Run IBM Bob Shell non-interactively with auto_edit approval (edits auto-approved, shell still confirmed by Bob).",
      inputSchema: bobPromptSchema,
    },
    async (args) => {
      try {
        const result = await runBobPrompt({
          prompt: args.prompt,
          mode: args.mode as BobChatMode | undefined,
          workspace: args.workspace,
          includeDirectories: args.include_directories,
          model: args.model,
          stdin: args.stdin,
        });

        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
