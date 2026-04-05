import type { ToolResult } from "../types.js";
import { getCategories } from "../../services/lunchmoney.js";

export async function handleGetCategories(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const format = args.format as "flattened" | "nested" | undefined;
  const result = await getCategories({ format });
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.categories, null, 2),
      },
    ],
  };
}
