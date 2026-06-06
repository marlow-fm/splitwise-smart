import type { ParsedExpense } from '@/lib/types';
import { extractExpenseMonth } from '@/lib/dates';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'pizza', 'coffee', 'uber eats', 'doordash', 'meal'],
  groceries: ['grocery', 'groceries', 'costco', 'trader', 'safeway', 'market'],
  transport: ['uber', 'lyft', 'taxi', 'gas', 'parking', 'bus', 'train'],
  utilities: ['rent', 'utilities', 'electric', 'water', 'internet', 'wifi'],
  entertainment: ['netflix', 'spotify', 'movie', 'concert', 'game'],
  shopping: ['amazon', 'shopping', 'target', 'walmart'],
};

const BUYER_VERBS = 'bought|got|picked\\s+up|purchased|paid(?:\\s+for)?';

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'general';
}

function extractAmount(text: string): { amount: number; remaining: string } {
  const symbol = text.match(/[$£€]\s*(\d+(?:\.\d{1,2})?)/);
  if (symbol) {
    return {
      amount: parseFloat(symbol[1]),
      remaining: text.replace(symbol[0], ' '),
    };
  }

  const decimal = text.match(/\b(\d{1,6}\.\d{1,2})\b/);
  if (decimal) {
    return {
      amount: parseFloat(decimal[1]),
      remaining: text.replace(decimal[0], ' '),
    };
  }

  const integers = [...text.matchAll(/\b(\d{1,6})\b/g)];
  for (const m of integers) {
    const idx = m.index ?? 0;
    const before = text.slice(0, idx).trimEnd().split(/\s+/).pop()?.toLowerCase() ?? '';
    const after = text.slice(idx + m[0].length).trimStart().split(/\s+/)[0]?.toLowerCase() ?? '';
    const skipBefore = ['all', 'of', 'for', 'between', 'among', 'split', 'divide'];
    const skipAfter = ['of', 'people', 'person', 'us', 'way', 'ways', 'share', 'shares'];
    if (skipBefore.includes(before) || skipAfter.includes(after)) continue;
    return {
      amount: parseFloat(m[1]),
      remaining: text.slice(0, idx) + ' ' + text.slice(idx + m[0].length),
    };
  }

  return { amount: 0, remaining: text };
}

function matchKnownName(name: string, knownUsers: string[]): string | null {
  const lower = name.toLowerCase();
  return knownUsers.find((u) => u.toLowerCase() === lower) ?? null;
}

function extractPayer(
  text: string,
  knownUsers: string[],
): { payer: string | null; remaining: string } {
  if (/\b(i|me)\s+(paid|bought|got|purchased)\b/i.test(text)) {
    return {
      payer: '__me__',
      remaining: text.replace(/\b(i|me)\s+(paid|bought|got|purchased)\b/i, ' '),
    };
  }

  const buyerPattern = new RegExp(
    `\\b([A-Za-z][\\w]*)\\s+(${BUYER_VERBS})\\b`,
    'i',
  );
  const buyerMatch = text.match(buyerPattern);
  if (buyerMatch) {
    const name = matchKnownName(buyerMatch[1], knownUsers) ?? buyerMatch[1];
    return {
      payer: name,
      remaining: text.replace(buyerMatch[0], ' '),
    };
  }

  return { payer: null, remaining: text };
}

function extractParticipants(
  text: string,
  knownUsers: string[],
  payer: string | null,
): { participants: string[]; splitEveryone: boolean; remaining: string } {
  const everyonePattern = /\b(for\s+)?(everyone|everybody|the\s+whole\s+house)\b/i;
  const allOfUsPattern = /\ball\s+of\s+us\b/i;

  if (everyonePattern.test(text) || allOfUsPattern.test(text)) {
    return {
      participants: [],
      splitEveryone: true,
      remaining: text
        .replace(everyonePattern, ' ')
        .replace(allOfUsPattern, ' ')
        .replace(/\bsplit\s+with\s+everyone\b/gi, ' '),
    };
  }

  const colonList = text.match(/:\s*([A-Za-z][\w]*(?:\s*(?:,|and)\s*[A-Za-z][\w]*)+)/i);
  if (colonList) {
    const names = colonList[1]
      .split(/,|\band\b/i)
      .map((n) => n.trim())
      .filter((n) => n.length > 1);
    if (names.length) {
      return {
        participants: names,
        splitEveryone: false,
        remaining: text.replace(colonList[0], ' '),
      };
    }
  }

  const withMatch = text.match(
    /\b(?:with|between|among|split\s+with)\s+([A-Za-z][\w,\s]+?)(?:\.|,\s*(?:split|I|me|equally)|$)/i,
  );
  if (withMatch) {
    const names = withMatch[1]
      .split(/,|\band\b/i)
      .map((n) => n.trim())
      .filter((n) => n.length > 1 && !/^(everyone|everybody)$/i.test(n));
    if (names.length) {
      return {
        participants: names,
        splitEveryone: false,
        remaining: text.replace(withMatch[0], ' '),
      };
    }
  }

  // Fallback: names mentioned in text, excluding the payer (buyer name alone ≠ split list)
  const payerLower = payer?.toLowerCase();
  const found = knownUsers.filter((name) => {
    if (payerLower && name.toLowerCase() === payerLower) return false;
    return new RegExp(`\\b${name}\\b`, 'i').test(text);
  });

  return { participants: found, splitEveryone: false, remaining: text };
}

export function parseInput(raw: string, knownUsers: string[] = []): ParsedExpense {
  let text = raw.trim();
  const now = new Date();

  const { payer, remaining: afterPayer } = extractPayer(text, knownUsers);
  text = afterPayer;

  const { date: expenseMonth, remaining: afterMonth } = extractExpenseMonth(text, now);
  text = afterMonth;

  const { amount, remaining: afterAmount } = extractAmount(text);
  text = afterAmount;

  const {
    participants: rawParticipants,
    splitEveryone,
    remaining: afterParticipants,
  } = extractParticipants(text, knownUsers, payer);
  text = afterParticipants;

  const participants = rawParticipants
    .map((p) => matchKnownName(p, knownUsers) ?? p)
    .filter((p, i, arr) => arr.findIndex((x) => x.toLowerCase() === p.toLowerCase()) === i);

  const description =
    text
      .replace(/\bsplit\s+(equally|evenly)?\s*(between|among|with)?/gi, ' ')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^(the|a|an)\s+/i, '')
      .trim() || 'Expense';

  const date = expenseMonth ?? now;

  return {
    description,
    amount,
    category: detectCategory(raw),
    payer,
    participants,
    splitEveryone,
    date: date.toISOString(),
    expenseFor: expenseMonth ? date.toISOString() : null,
  };
}
