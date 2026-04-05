import type { ToolResult } from "../types.js";
import { getUser } from "../../services/lunchmoney.js";

export async function handleGetUser(): Promise<ToolResult> {
  const user = await getUser();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(user, null, 2),
      },
    ],
  };
}
