export const CATEGORIES: Record<string, { emoji: string; label: string }> = {
  general: { emoji: '💰', label: 'General' },
  food: { emoji: '🍕', label: 'Food' },
  groceries: { emoji: '🛒', label: 'Groceries' },
  utilities: { emoji: '💡', label: 'Utilities' },
  transport: { emoji: '🚗', label: 'Transport' },
  entertainment: { emoji: '🎬', label: 'Entertainment' },
  shopping: { emoji: '🛍️', label: 'Shopping' },
};

export function categoryLabel(key: string): string {
  return CATEGORIES[key]?.label ?? key;
}

export function categoryEmoji(key: string): string {
  return CATEGORIES[key]?.emoji ?? '💰';
}
