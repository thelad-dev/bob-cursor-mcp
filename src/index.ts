#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPromptTools } from "./tools/prompt.js";
import { registerSessionTools } from "./tools/sessions.js";

async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: "ibm-bob",
      version: "0.1.0",
    },
    {
      instructions:
        "IBM Bob Shell bridge. Use bob_prompt to delegate tasks to Bob (default mode: advanced; also plan, code, ask). Requires BOBSHELL_API_KEY for prompt/resume calls.",
    },
  );

  registerPromptTools(server);
  registerSessionTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
