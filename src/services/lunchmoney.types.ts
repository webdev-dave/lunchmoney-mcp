export interface User {
  user_name: string;
  user_email: string;
  user_id: number;
  account_id: number;
  budget_name: string;
  primary_currency: string;
  api_key_label: string | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  group_id: number | null;
  is_group: boolean;
  children?: Category[];
}

export interface Tag {
  id: number;
  name: string;
  description: string | null;
  archived: boolean;
}

export interface Transaction {
  id: number;
  date: string;
  payee: string;
  amount: string;
  currency: string;
  to_base: number;
  notes: string | null;
  category_id: number | null;
  category_name: string | null;
  category_group_id: number | null;
  category_group_name: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  is_pending: boolean;
  has_children: boolean;
  group_id: number | null;
  parent_id: number | null;
  external_id: string | null;
  original_name: string | null;
  type: string | null;
  subtype: string | null;
  fees: string | null;
  price: string | null;
  quantity: string | null;
  plaid_account_id: number | null;
  asset_id: number | null;
  tags: Tag[] | null;
}

export interface PlaidAccount {
  id: number;
  date_linked: string;
  name: string;
  display_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  institution_name: string;
  status: string;
  balance: string;
  currency: string;
  balance_last_update: string;
  limit: string | null;
}

export interface Asset {
  id: number;
  type_name: string;
  subtype_name: string | null;
  name: string;
  display_name: string | null;
  balance: string;
  balance_as_of: string;
  currency: string;
  closed_on: string | null;
  institution_name: string | null;
  created_at: string;
}

export interface RecurringItem {
  id: number;
  start_date: string | null;
  end_date: string | null;
  payee: string;
  currency: string;
  amount: string;
  to_base: number;
  cadence: string;
  description: string | null;
  billing_date: string;
  type: string;
  original_name: string | null;
  source: string;
  plaid_account_id: number | null;
  asset_id: number | null;
  category_id: number | null;
}

export interface Budget {
  category_name: string;
  category_id: number | null;
  category_group_name: string | null;
  group_id: number | null;
  is_group: boolean;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  data: Record<string, BudgetPeriod>;
  config: BudgetConfig | null;
  order: number;
  archived: boolean;
  recurring: {
    list: RecurringItem[];
    sources: string[];
  } | null;
}

export interface BudgetPeriod {
  budget_month: string;
  budget_to_base: number;
  budget_amount: number | null;
  budget_currency: string | null;
  spending_to_base: number;
  num_transactions: number;
}

export interface BudgetConfig {
  config_id: number;
  cadence: string;
  amount: number;
  currency: string;
  to_base: number;
  auto_suggest: string;
}

export interface GetTransactionsParams {
  start_date: string;
  end_date: string;
  category_id?: number;
  plaid_account_id?: number;
  tag_id?: number;
  status?: "cleared" | "uncleared" | "pending";
  debit_as_negative?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetRecurringParams {
  start_date?: string;
  debit_as_negative?: boolean;
}

export interface GetBudgetsParams {
  start_date: string;
  end_date: string;
}
