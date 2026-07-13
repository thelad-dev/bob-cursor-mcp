#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.resolve(__dirname, "../dist/index.js");

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content
    ?.map((item) => ("text" in item ? item.text : JSON.stringify(item)))
    .join("\n");
  console.log(`\n=== ${name} ===`);
  console.log(text ?? "(empty)");
  if (result.isError) {
    throw new Error(`${name} failed`);
  }
}

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverEntry],
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      BOB_BIN: process.env.BOB_BIN || "bob",
    },
  });

  const client = new Client({ name: "ibm-bob-smoke-test", version: "0.1.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log(
    "Registered tools:",
    tools.tools.map((tool) => tool.name).join(", "),
  );

  await callTool(client, "bob_version");
  await callTool(client, "bob_list_sessions", {
    workspace: path.resolve(__dirname, ".."),
  });

  if (process.env.BOBSHELL_API_KEY?.trim()) {
    await callTool(client, "bob_prompt", {
      mode: "ask",
      prompt: "What is 2+2? Reply with just the number.",
      workspace: path.resolve(__dirname, ".."),
    });
  } else {
    console.log("\n=== bob_prompt ===");
    console.log("Skipped (BOBSHELL_API_KEY not set).");
  }

  await client.close();
  console.log("\nSmoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
