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
  food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'pizza', 'sushi', 'taco', 'burger', 'cafe', 'coffee', 'boba', 'drink', 'bar', 'drinks', 'brunch', 'meal', 'eat'],
  transport: ['uber', 'lyft', 'taxi', 'gas', 'parking', 'bus', 'train', 'metro', 'flight', 'airfare', 'toll', 'ride', 'subway', 'transit'],
  housing: ['rent', 'utilities', 'electric', 'water', 'internet', 'wifi', 'mortgage', 'hoa', 'maintenance', 'lease'],
  entertainment: ['movie', 'netflix', 'spotify', 'hulu', 'game', 'concert', 'ticket', 'show', 'event', 'disney', 'cinema'],
  groceries: ['grocery', 'groceries', 'supermarket', 'costco', 'trader', 'safeway', 'walmart', 'target', 'market', 'whole foods', 'aldi'],
  health: ['gym', 'doctor', 'pharmacy', 'medicine', 'hospital', 'dental', 'health', 'fitness', 'workout'],
  travel: ['hotel', 'airbnb', 'vrbo', 'resort', 'motel', 'hostel', 'vacation', 'trip', 'booking'],
  shopping: ['amazon', 'shopping', 'clothes', 'shoes', 'accessories', 'furniture', 'ikea', 'mall'],
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

/**
 * Robustly extract a dollar amount from the text.
 * Prioritises $-prefixed values, then decimal numbers, then plain integers.
 * Skips numbers that look like ordinals (1st, 2nd) or counts ("6 of us").
 */
function extractAmount(text: string): { amount: number; currency: string; remaining: string } {
  // First try: explicit currency symbol
  const symbolMatch = text.match(/([$£€])\s*(\d+(?:\.\d{1,2})?)/);
  if (symbolMatch) {
    const currency = symbolMatch[1] === '$' ? 'USD' : symbolMatch[1] === '£' ? 'GBP' : 'EUR';
    return {
      amount: parseFloat(symbolMatch[2]),
      currency,
      remaining: text.replace(symbolMatch[0], ' '),
    };
  }

  // Second try: decimal number (more specific - must have decimal part)
  const decimalMatch = text.match(/\b(\d{1,6}\.\d{1,2})\b/);
  if (decimalMatch) {
    return {
      amount: parseFloat(decimalMatch[1]),
      currency: 'USD',
      remaining: text.replace(decimalMatch[0], ' '),
    };
  }

  // Third try: plain integer but NOT preceded by words like "all", "of", "for"
  // and not followed by words like "of", "people", "person", "us", "way"
  const intMatches = [...text.matchAll(/\b(\d{2,6})\b/g)];
  for (const m of intMatches) {
    const before = text.slice(0, m.index).trimEnd();
    const after = text.slice((m.index ?? 0) + m[0].length).trimStart();
    const beforeWord = before.split(/\s+/).pop()?.toLowerCase() ?? '';
    const afterWord = after.split(/\s+/)[0]?.toLowerCase() ?? '';
    const skipBefore = ['all', 'of', 'for', 'between', 'among', 'into', 'split', 'divide', 'across'];
    const skipAfter = ['of', 'people', 'person', 'persons', 'us', 'way', 'ways', 'share', 'shares', 'st', 'nd', 'rd', 'th'];
    if (skipBefore.includes(beforeWord) || skipAfter.includes(afterWord)) continue;
    return {
      amount: parseFloat(m[1]),
      currency: 'USD',
      remaining: text.slice(0, m.index) + ' ' + text.slice((m.index ?? 0) + m[0].length),
    };
  }

  return { amount: 0, currency: 'USD', remaining: text };
}

/**
 * Extract participant names from natural language.
 * Handles:
 *  - "split with Alex and Jamie"
 *  - "between Mason, Atticus, Kevin"
 *  - "all 6 of us: Mason, Atticus, Kevin, Liam and Xander"
 *  - "between all of us: Alice, Bob"
 *  - colon-separated lists anywhere in the text
 */
function extractParticipants(text: string, knownUsers: string[]): { participants: string[]; remaining: string } {
  // Pattern: colon followed by a list of names (comma/and separated)
  const colonListMatch = text.match(/:\s*([A-Z][a-zA-Z]+((?:[,\s]+(?:and\s+)?[A-Z][a-zA-Z]+)+)?)/);
  if (colonListMatch) {
    const nameStr = colonListMatch[1];
    const names = nameStr.split(/,|\band\b/i).map((n) => n.trim()).filter((n) => n.length > 1 && /^[A-Z]/.test(n));
    if (names.length > 0) {
      return { participants: names, remaining: text.replace(colonListMatch[0], ' ') };
    }
  }

  // Pattern: "with X and Y" or "between X, Y and Z"
  const withMatch = text.match(/\b(?:with|between|among)\s+([A-Za-z][\w,\s]+?)(?:\.|,\s*(?:split|I|me|equally|each)|$)/i);
  if (withMatch) {
    const names = withMatch[1].split(/,|\band\b/i).map((n) => n.trim()).filter((n) => n.length > 1);
    if (names.length > 0) {
      return { participants: names, remaining: text.replace(withMatch[0], ' ') };
    }
  }

  // Fallback: match known user names in the text
  const found = knownUsers.filter((u) => {
    const re = new RegExp(`\\b${u}\\b`, 'i');
    return re.test(text);
  });
  return { participants: found, remaining: text };
}

export function parseInput(
  raw: string,
  knownUsers: string[] = [],
  knownGroups: string[] = []
): ParsedExpense {
  let text = raw.trim();

  // --- Extract group ---
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
  const personPaidMatch = text.match(/\b([A-Z][a-z]+)\s+paid\b/);
  if (iMatch) {
    payer = 'me';
    text = text.replace(iMatch[0], '');
  } else if (personPaidMatch) {
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
    for (const m of shareMatches) shares[m[1]] = parseInt(m[2]);
  } else if (/%/.test(text) || /\bpercent(age)?\b/i.test(text)) {
    splitType = 'percentage';
    const pctMatches = text.matchAll(/(\w+)\s+(\d+)%/gi);
    for (const m of pctMatches) percentages[m[1]] = parseInt(m[2]);
  } else if (/\bexact\b/i.test(text)) {
    splitType = 'exact';
  }

  // --- Extract amount (must happen before participant extraction to avoid number confusion) ---
  const { amount, currency, remaining } = extractAmount(text);
  text = remaining;

  // --- Extract participants ---
  const { participants, remaining: remaining2 } = extractParticipants(text, knownUsers);
  text = remaining2;

  // --- Extract date ---
  const date = parseDate(raw);
  text = text
    .replace(/\byesterday\b/gi, '')
    .replace(/\blast\s+week\b/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/g, '')
    .replace(/\ball\s+\d+\s+of\s+us\b/gi, '')
    .replace(/\bsplit\s+(equally|evenly)?\s*(between|among|with)?/gi, '')
    .replace(/\bequally\b/gi, '');

  // --- Description is what remains ---
  const description = text
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(split|divide|equally|between|for|paid|this|is|the|are)\s+/i, '')
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
