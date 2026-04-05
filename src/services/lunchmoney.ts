import type {
  User,
  Category,
  Tag,
  Transaction,
  PlaidAccount,
  Asset,
  RecurringItem,
  Budget,
  GetTransactionsParams,
  GetRecurringParams,
  GetBudgetsParams,
} from "./lunchmoney.types.js";

// Re-export types for convenience
export type {
  User,
  Category,
  Tag,
  Transaction,
  PlaidAccount,
  Asset,
  RecurringItem,
  Budget,
  GetTransactionsParams,
  GetRecurringParams,
  GetBudgetsParams,
} from "./lunchmoney.types.js";

const BASE_URL = "https://dev.lunchmoney.app/v1";

export class LunchMoneyError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "LunchMoneyError";
  }
}

function getApiToken(): string {
  const token = process.env.LUNCHMONEY_API_TOKEN;
  if (!token) {
    throw new LunchMoneyError("LUNCHMONEY_API_TOKEN environment variable is required");
  }
  return token;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

async function request<T>(
  endpoint: string,
  params?: QueryParams
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getApiToken()}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  // Lunch Money returns errors as 200 with { "error": "..." }
  if (data.error) {
    throw new LunchMoneyError(data.error, response.status);
  }

  if (!response.ok) {
    throw new LunchMoneyError(
      `API request failed: ${response.statusText}`,
      response.status
    );
  }

  return data as T;
}

// ============ API Methods ============

export async function getUser(): Promise<User> {
  return request<User>("/me");
}

export async function getCategories(params?: {
  format?: "flattened" | "nested";
}): Promise<{ categories: Category[] }> {
  return request<{ categories: Category[] }>("/categories", params);
}

export async function getTags(): Promise<Tag[]> {
  return request<Tag[]>("/tags");
}

export async function getTransactions(
  params: GetTransactionsParams
): Promise<{ transactions: Transaction[] }> {
  return request<{ transactions: Transaction[] }>("/transactions", {
    start_date: params.start_date,
    end_date: params.end_date,
    category_id: params.category_id,
    plaid_account_id: params.plaid_account_id,
    tag_id: params.tag_id,
    status: params.status,
    debit_as_negative: params.debit_as_negative ?? true,
    limit: params.limit,
    offset: params.offset,
  });
}

export async function getPlaidAccounts(): Promise<{
  plaid_accounts: PlaidAccount[];
}> {
  return request<{ plaid_accounts: PlaidAccount[] }>("/plaid_accounts");
}

export async function getAssets(): Promise<{ assets: Asset[] }> {
  return request<{ assets: Asset[] }>("/assets");
}

export async function getRecurringItems(
  params?: GetRecurringParams
): Promise<{ recurring_items: RecurringItem[] }> {
  return request<{ recurring_items: RecurringItem[] }>("/recurring_items", {
    start_date: params?.start_date,
    debit_as_negative: params?.debit_as_negative ?? true,
  });
}

export async function getBudgets(
  params: GetBudgetsParams
): Promise<Budget[]> {
  return request<Budget[]>("/budgets", {
    start_date: params.start_date,
    end_date: params.end_date,
  });
}
