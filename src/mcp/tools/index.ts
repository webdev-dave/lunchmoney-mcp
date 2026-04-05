import type { ToolDefinition, ToolHandler } from "../types.js";

// Tool definitions that Claude will see
export const toolDefinitions: ToolDefinition[] = [
  {
    name: "get_user",
    description: "Get the current user's Lunch Money account information including name, email, budget name, and primary currency.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_categories",
    description: "Get all spending categories. Use format='nested' to see category groups with their children.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          description: "Response format: 'flattened' (default) or 'nested' for hierarchical view",
          enum: ["flattened", "nested"],
        },
      },
    },
  },
  {
    name: "get_tags",
    description: "Get all transaction tags.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_transactions",
    description: "Get transactions within a date range. Both start_date and end_date are required. Amounts are returned with expenses as negative numbers.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (required)",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format (required)",
        },
        category_id: {
          type: "number",
          description: "Filter by category ID",
        },
        plaid_account_id: {
          type: "number",
          description: "Filter by linked bank account ID",
        },
        tag_id: {
          type: "number",
          description: "Filter by tag ID",
        },
        status: {
          type: "string",
          description: "Filter by transaction status",
          enum: ["cleared", "uncleared", "pending"],
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return",
        },
        offset: {
          type: "number",
          description: "Number of transactions to skip (for pagination)",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_plaid_accounts",
    description: "Get all linked bank accounts (via Plaid) including their current balances.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_assets",
    description: "Get all manually-tracked assets (accounts not linked via Plaid).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_recurring_items",
    description: "Get recurring expenses and income. Amounts are returned with expenses as negative numbers.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Optional start date in YYYY-MM-DD format to filter recurring items",
        },
      },
    },
  },
  {
    name: "get_budgets",
    description: "Get budget data for a date range. Shows budget amounts and actual spending by category.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (required)",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format (required)",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
];

// Import tool handlers (will be implemented in separate files)
import { handleGetUser } from "./user.js";
import { handleGetCategories } from "./categories.js";
import { handleGetTags } from "./tags.js";
import { handleGetTransactions } from "./transactions.js";
import { handleGetPlaidAccounts } from "./accounts.js";
import { handleGetAssets } from "./assets.js";
import { handleGetRecurringItems } from "./recurring.js";
import { handleGetBudgets } from "./budgets.js";

// Tool registry: maps tool names to their handlers
export const toolHandlers: Record<string, ToolHandler> = {
  get_user: handleGetUser,
  get_categories: handleGetCategories,
  get_tags: handleGetTags,
  get_transactions: handleGetTransactions,
  get_plaid_accounts: handleGetPlaidAccounts,
  get_assets: handleGetAssets,
  get_recurring_items: handleGetRecurringItems,
  get_budgets: handleGetBudgets,
};
