import type { ToolResult } from "../types.js";
import { getTransactions } from "../../services/lunchmoney.js";

export async function handleGetTransactions(
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

  const result = await getTransactions({
    start_date: startDate,
    end_date: endDate,
    category_id: args.category_id as number | undefined,
    plaid_account_id: args.plaid_account_id as number | undefined,
    tag_id: args.tag_id as number | undefined,
    status: args.status as "cleared" | "uncleared" | "pending" | undefined,
    limit: args.limit as number | undefined,
    offset: args.offset as number | undefined,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.transactions, null, 2),
      },
    ],
  };
}
