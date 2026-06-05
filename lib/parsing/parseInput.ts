export type SplitType = 'equal' | 'percentage' | 'exact' | 'shares';

export interface ParsedExpense {
  description: string;
  amount: number;
  currency: string;
  category: string;
  splitType: SplitType;
  payer: string | null;
  participants: string[];
  group: string | null;
  date: Date;
  notes: string | null;
  percentages?: Record<string, number>;
  shares?: Record<string, number>;
  exactAmounts?: Record<string, number>;
}

const CATEGORY_MAP: Record<string, string[]> = {
  food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'pizza', 'sushi', 'taco', 'burger', 'cafe', 'coffee', 'boba', 'drink', 'bar', 'drinks', 'brunch'],
  transport: ['uber', 'lyft', 'taxi', 'gas', 'parking', 'bus', 'train', 'metro', 'flight', 'airfare', 'toll', 'ride'],
  housing: ['rent', 'utilities', 'electric', 'water', 'internet', 'wifi', 'mortgage', 'hoa', 'maintenance'],
  entertainment: ['movie', 'netflix', 'spotify', 'hulu', 'game', 'concert', 'ticket', 'show', 'event'],
  groceries: ['grocery', 'groceries', 'supermarket', 'costco', 'trader', 'safeway', 'walmart', 'target', 'market'],
  health: ['gym', 'doctor', 'pharmacy', 'medicine', 'hospital', 'dental', 'health'],
  travel: ['hotel', 'airbnb', 'vrbo', 'resort', 'motel', 'hostel', 'vacation', 'trip'],
  shopping: ['amazon', 'shopping', 'clothes', 'shoes', 'accessories', 'furniture'],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'general';
}

function parseDate(text: string): Date {
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (lower.includes('last week')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return now;
}

export function parseInput(
  raw: string,
  knownUsers: string[] = [],
  knownGroups: string[] = []
): ParsedExpense {
  let text = raw.trim();

  // --- Extract group: "group: X" or "@X" ---
  let group: string | null = null;
  const groupColonMatch = text.match(/group:\s*([\w\s]+?)(?:,|$)/i);
  if (groupColonMatch) {
    group = groupColonMatch[1].trim();
    text = text.replace(groupColonMatch[0], '');
  } else {
    const atMatch = text.match(/@([\w]+)/);
    if (atMatch) {
      group = atMatch[1];
      text = text.replace(atMatch[0], '');
    } else {
      for (const g of knownGroups) {
        if (text.toLowerCase().includes(g.toLowerCase())) {
          group = g;
          break;
        }
      }
    }
  }

  // --- Extract payer ---
  let payer: string | null = null;
  const iMatch = text.match(/\b(i|me)\s+paid\b/i);
  const personPaidMatch = text.match(/(\w+)\s+paid\b/i);
  if (iMatch) {
    payer = 'me';
    text = text.replace(iMatch[0], '');
  } else if (personPaidMatch && !['equal', 'split', 'divide'].includes(personPaidMatch[1].toLowerCase())) {
    payer = personPaidMatch[1];
    text = text.replace(personPaidMatch[0], '');
  }

  // --- Extract split type ---
  let splitType: SplitType = 'equal';
  const percentages: Record<string, number> = {};
  const shares: Record<string, number> = {};
  const exactAmounts: Record<string, number> = {};

  if (/\bshares?\b/i.test(text)) {
    splitType = 'shares';
    const shareMatches = text.matchAll(/(\w+)\s+(\d+)\s*share/gi);
    for (const m of shareMatches) {
      shares[m[1]] = parseInt(m[2]);
    }
  } else if (/%/.test(text) || /\bpercent(age)?\b/i.test(text)) {
    splitType = 'percentage';
    const pctMatches = text.matchAll(/(\w+)\s+(\d+)%/gi);
    for (const m of pctMatches) {
      percentages[m[1]] = parseInt(m[2]);
    }
  } else if (/\bexact\b/i.test(text)) {
    splitType = 'exact';
  }

  // --- Extract amount ---
  let amount = 0;
  let currency = 'USD';
  const amountMatch = text.match(/[$£€]?\s*(\d+(?:\.\d{1,2})?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
    if (amountMatch[0].includes('$')) currency = 'USD';
    if (amountMatch[0].includes('£')) currency = 'GBP';
    if (amountMatch[0].includes('€')) currency = 'EUR';
    text = text.replace(amountMatch[0], ' ');
  }

  // --- Extract participants ---
  const withMatch = text.match(/\bwith\s+([\w,\s]+?)(?:,|\.|$)/i);
  let participants: string[] = [];
  if (withMatch) {
    participants = withMatch[1]
      .split(/,|\band\b/i)
      .map((p) => p.trim())
      .filter(Boolean);
    text = text.replace(withMatch[0], ' ');
  } else {
    for (const user of knownUsers) {
      if (text.toLowerCase().includes(user.toLowerCase())) {
        participants.push(user);
      }
    }
  }

  // --- Extract date ---
  const date = parseDate(raw);
  text = text
    .replace(/\byesterday\b/gi, '')
    .replace(/\blast\s+week\b/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/g, '');

  // --- Description is what remains ---
  const description = text
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(split|divide|equally|between|for)/i, '')
    .trim() || 'Expense';

  const category = detectCategory(raw);

  return {
    description,
    amount,
    currency,
    category,
    splitType,
    payer,
    participants,
    group,
    date,
    notes: null,
    ...(splitType === 'percentage' && Object.keys(percentages).length ? { percentages } : {}),
    ...(splitType === 'shares' && Object.keys(shares).length ? { shares } : {}),
    ...(splitType === 'exact' && Object.keys(exactAmounts).length ? { exactAmounts } : {}),
  };
}
