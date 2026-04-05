import type { ToolResult } from "../types.js";
import { getPlaidAccounts } from "../../services/lunchmoney.js";

export async function handleGetPlaidAccounts(): Promise<ToolResult> {
  const result = await getPlaidAccounts();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.plaid_accounts, null, 2),
      },
    ],
  };
}
