/**
 * Import Mount Bussy Expenses.xlsx into the database.
 * Usage: node scripts/import-spreadsheet.mjs [path-to-xlsx]
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const SHARED_NAMES = ['Marlow', 'Kevin', 'Atticus', 'Xander'];

const CATEGORY_MAP = {
  insurance: 'utilities',
  furniture: 'shopping',
  utilities: 'utilities',
  rent: 'utilities',
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* .env.local optional if already set */
  }
}

function mapCategory(raw) {
  const key = String(raw || 'general').trim().toLowerCase();
  return CATEGORY_MAP[key] ?? 'general';
}

function isReimbursement(row) {
  const cat = String(row.Category || '').toLowerCase();
  if (cat.includes('reimburse')) return true;
  const desc = String(row.Description || '').toLowerCase().trim();
  const forVal = String(row['For (If Split)'] || '').trim();
  if (forVal && forVal.toLowerCase() !== 'shared' && (desc === 'payment' || desc.startsWith('reimburse'))) {
    return true;
  }
  return false;
}

function parseDate(val) {
  if (val instanceof Date) return val;
  return new Date(val);
}

async function main() {
  loadEnv();
  const filePath =
    process.argv[2] || 'C:/Users/loopi/Downloads/Mount Bussy Expenses.xlsx';
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Transactions'], { defval: '' });

  const db = new PrismaClient();

  try {
    const userMap = new Map();
    const existing = await db.user.findMany();
    for (const u of existing) userMap.set(u.name.toLowerCase(), u);

    let colorIdx = existing.length;
    for (const name of SHARED_NAMES) {
      if (!userMap.has(name.toLowerCase())) {
        const u = await db.user.create({
          data: { name, color: COLORS[colorIdx++ % COLORS.length] },
        });
        userMap.set(name.toLowerCase(), u);
        console.log('Created user:', name);
      }
    }

    const sharedIds = SHARED_NAMES.map((n) => userMap.get(n.toLowerCase())?.id).filter(Boolean);

    await db.expenseSplit.deleteMany();
    await db.expense.deleteMany();
    await db.settlement.deleteMany();
    console.log('Cleared existing expenses and settlements');

    let expenseCount = 0;
    let settlementCount = 0;

    for (const row of rows) {
      if (!row.Date || !row.Amount) continue;

      const paidByName = String(row['Paid By'] || '').trim();
      const forVal = String(row['For (If Split)'] || '').trim();
      const amountCents = Math.round(Number(row.Amount) * 100);
      const date = parseDate(row.Date);
      const notes = String(row.Notes || '').trim();

      const payer = userMap.get(paidByName.toLowerCase());
      if (!payer) {
        console.warn('Skip — unknown payer:', paidByName, row.Description);
        continue;
      }

      if (isReimbursement(row)) {
        const toName = forVal;
        const toUser = userMap.get(toName.toLowerCase());
        if (!toUser) {
          console.warn('Skip settlement — unknown recipient:', toName);
          continue;
        }
        await db.settlement.create({
          data: {
            fromUserId: payer.id,
            toUserId: toUser.id,
            amountCents,
            note: notes || row.Description || null,
            createdAt: date,
          },
        });
        settlementCount++;
        continue;
      }

      let participantIds = sharedIds;
      if (forVal && forVal.toLowerCase() !== 'shared') {
        const target = userMap.get(forVal.toLowerCase());
        participantIds = target ? [payer.id, target.id] : sharedIds;
      }

      const uniqueIds = [...new Set([payer.id, ...participantIds])];
      const shareEach = Math.floor(amountCents / uniqueIds.length);
      const remainder = amountCents - shareEach * uniqueIds.length;
      const splits = uniqueIds.map((userId, i) => ({
        userId,
        shareCents: shareEach + (i < remainder ? 1 : 0),
      }));

      const description = String(row.Description || 'Expense').trim();
      const category = mapCategory(row.Category);

      await db.expense.create({
        data: {
          description: notes ? `${description} (${notes})` : description,
          amountCents,
          category,
          date,
          paidById: payer.id,
          splits: { create: splits },
        },
      });
      expenseCount++;
    }

    console.log(`Done — imported ${expenseCount} expenses and ${settlementCount} settlements`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
