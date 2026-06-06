# House Expenses

Simple shared expense tracker for a house. Add expenses with a title and amount, split them equally, and see who owes what.

## Setup

1. Copy `.env.example` to `.env.local` and set your PostgreSQL `DATABASE_URL`
2. `npm install`
3. `npm run db:push`
4. `npm run dev`

## Import spreadsheet

To load expenses from the Mount Bussy Excel sheet:

```bash
npm run import:spreadsheet -- "C:\path\to\Mount Bussy Expenses.xlsx"
```

- **Shared** rows → expenses split 4 ways (Marlow, Kevin, Atticus, Xander)
- **Reimbursement** rows → settlements (paid by → for person)
- Re-running clears existing expenses/settlements and re-imports

## Usage

1. **People** tab — add housemates and tap **This is me**
2. **Add** tab — fill in title, amount, date, and split, or set up **Monthly bills** (wifi, rent) for one-tap logging
3. **Balances** tab — see each person's net balance and simplified who-pays-whom
4. **History** tab — browse, search, and filter past expenses with split breakdowns
