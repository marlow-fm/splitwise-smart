export type User = {
  id: string;
  name: string;
  color: string;
};

export type ExpenseSplit = {
  id: string;
  userId: string;
  shareCents: number;
  user: User;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  category: string;
  date: string;
  paidById: string;
  recurringId?: string | null;
  paidBy: User;
  splits: ExpenseSplit[];
};

export type ParsedExpense = {
  description: string;
  amount: number;
  category: string;
  payer: string | null;
  participants: string[];
  splitEveryone: boolean;
  date: string;
  /** Set when a billing month was parsed from the input (for backlogging) */
  expenseFor: string | null;
};

export type NetBalance = {
  userId: string;
  name: string;
  color: string;
  netCents: number;
};

export type Debt = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
};

export type Settlement = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
  note: string | null;
  createdAt: string;
};

export type BalancesResponse = {
  net: NetBalance[];
  debts: Debt[];
  monthTotalCents: number;
  settlements: Settlement[];
};

export type RecurringExpense = {
  id: string;
  description: string;
  amountCents: number;
  category: string;
  paidById: string;
  paidBy: User;
  splits: { userId: string; user: User }[];
  appliedThisMonth: boolean;
};

export type Tab = 'add' | 'balances' | 'analytics' | 'history' | 'people';
