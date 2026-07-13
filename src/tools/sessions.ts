import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BobRunnerError,
  runBobListSessions,
  runBobResumeSession,
  runBobVersion,
} from "../bob-runner.js";
import { BOB_CHAT_MODES, getDefaultChatMode } from "../config.js";
import type { BobChatMode } from "../config.js";

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

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "bob_version",
    {
      description: "Return the installed IBM Bob Shell version (health check).",
      inputSchema: {},
    },
    async () => {
      try {
        const result = await runBobVersion();
        return {
          content: [{ type: "text", text: result.trim() }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "bob_list_sessions",
    {
      description: "List Bob Shell sessions for the current project workspace.",
      inputSchema: {
        workspace: z
          .string()
          .optional()
          .describe("Project directory whose Bob sessions should be listed."),
      },
    },
    async (args) => {
      try {
        const result = await runBobListSessions(args.workspace);
        return {
          content: [{ type: "text", text: result.trim() }],
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "bob_resume_session",
    {
      description:
        "Resume a previous Bob Shell session and run a new prompt with auto_edit approval.",
      inputSchema: {
        session: z
          .string()
          .min(1)
          .describe('Session index or "latest".'),
        prompt: z.string().min(1).describe("Follow-up prompt for the resumed session."),
        mode: z.enum(BOB_CHAT_MODES).default(getDefaultChatMode()),
        workspace: z.string().optional(),
        include_directories: z.array(z.string()).optional(),
        model: z.string().optional(),
        stdin: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const result = await runBobResumeSession({
          session: args.session,
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
