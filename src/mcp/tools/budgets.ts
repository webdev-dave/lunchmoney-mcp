import type { ToolResult } from "../types.js";
import { getBudgets } from "../../services/lunchmoney.js";

export async function handleGetBudgets(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const startDate = args.start_date as string;
  const endDate = args.end_date as string;

  if (!startDate || !endDate) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Both start_date and end_date are required",
        },
      ],
      isError: true,
    };
  }

  const budgets = await getBudgets({
    start_date: startDate,
    end_date: endDate,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(budgets, null, 2),
      },
    ],
  };
}
