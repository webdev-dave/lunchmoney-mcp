import type { ToolResult } from "../types.js";
import { getAssets } from "../../services/lunchmoney.js";

export async function handleGetAssets(): Promise<ToolResult> {
  const result = await getAssets();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.assets, null, 2),
      },
    ],
  };
}
