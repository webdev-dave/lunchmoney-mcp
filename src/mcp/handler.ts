import type { JsonRpcRequest, JsonRpcResponse, ToolResult } from "./types.js";
import { toolDefinitions, toolHandlers } from "./tools/index.js";

const SERVER_INFO = {
  name: "lunchmoney-mcp",
  version: "1.0.0",
};

const CAPABILITIES = {
  tools: {},
};

export async function handleMcpRequest(
  request: JsonRpcRequest
): Promise<JsonRpcResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      // MCP handshake methods
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: SERVER_INFO,
            capabilities: CAPABILITIES,
          },
        };

      case "notifications/initialized":
        // This is a notification, no response needed but we return success
        return {
          jsonrpc: "2.0",
          id,
          result: {},
        };

      // Tool methods
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: toolDefinitions,
          },
        };

      case "tools/call":
        return await handleToolCall(id, params);

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    };
  }
}

async function handleToolCall(
  id: string | number,
  params?: Record<string, unknown>
): Promise<JsonRpcResponse> {
  if (!params || typeof params.name !== "string") {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32602,
        message: "Invalid params: missing tool name",
      },
    };
  }

  const toolName = params.name;
  const toolArgs = (params.arguments as Record<string, unknown>) || {};

  const handler = toolHandlers[toolName];
  if (!handler) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32602,
        message: `Unknown tool: ${toolName}`,
      },
    };
  }

  try {
    const result: ToolResult = await handler(toolArgs);
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  } catch (error) {
    // Return error as tool result (not JSON-RPC error) so Claude can see it
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      },
    };
  }
}
