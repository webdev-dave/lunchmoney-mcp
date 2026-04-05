import type { ToolResult } from "../types.js";
import { getRecurringItems } from "../../services/lunchmoney.js";

export async function handleGetRecurringItems(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await getRecurringItems({
    start_date: args.start_date as string | undefined,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.recurring_items, null, 2),
      },
    ],
  };
}
