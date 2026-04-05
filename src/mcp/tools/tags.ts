import type { ToolResult } from "../types.js";
import { getTags } from "../../services/lunchmoney.js";

export async function handleGetTags(): Promise<ToolResult> {
  const tags = await getTags();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(tags, null, 2),
      },
    ],
  };
}
