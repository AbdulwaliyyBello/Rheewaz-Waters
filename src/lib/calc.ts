export const PRICE_PER_BAG = 350;
export const COMMISSION_PER_BAG = 12;

export type RawDay = {
  weekday: string;
  bags: number;
  cash: number;
  transfer: number;
  roadExpenses: number;
  submitted: boolean;
};

export type CalculatedDay = RawDay & {
  price: number;
  outstanding: number;
  commission: number;
};

/** Formula: Price = Bags × ₦350. Outstanding = Price − Cash − Transfer − Road Expenses. Commission = Bags × ₦12. */
export function calcDay(d: RawDay): CalculatedDay {
  const price = d.bags * PRICE_PER_BAG;
  const outstanding = price - d.cash - d.transfer - d.roadExpenses;
  const commission = d.bags * COMMISSION_PER_BAG;
  return { ...d, price, outstanding, commission };
}

export type WeekTotals = {
  bags: number;
  price: number;
  cash: number;
  transfer: number;
  roadExpenses: number;
  outstanding: number;
  commission: number;
};

export function calcWeekTotals(days: RawDay[]): { rows: CalculatedDay[]; totals: WeekTotals } {
  const rows = days.map(calcDay);
  const totals = rows.reduce<WeekTotals>(
    (a, r) => ({
      bags: a.bags + r.bags,
      price: a.price + r.price,
      cash: a.cash + r.cash,
      transfer: a.transfer + r.transfer,
      roadExpenses: a.roadExpenses + r.roadExpenses,
      outstanding: a.outstanding + r.outstanding,
      commission: a.commission + r.commission,
    }),
    { bags: 0, price: 0, cash: 0, transfer: 0, roadExpenses: 0, outstanding: 0, commission: 0 }
  );
  return { rows, totals };
}

/** Commission Payable = Current Week Commission − Previous Week Outstanding. */
export function calcCommissionPayable(weekCommission: number, previousWeekOutstanding: number): number {
  return weekCommission - previousWeekOutstanding;
}

export type CompanyWeekSummary = {
  totalPrice: number;
  totalCash: number;
  totalTransfer: number;
  totalOutstanding: number;
  totalCommission: number;
  totalRoadExpenses: number;
  factoryExpenses: number;
  nylonRollExpenses: number;
  totalExpenses: number;
  grossIncome: number;
  cashLeft: number;
};

/**
 * Company-wide weekly rollup.
 * Total Expenses = Factory Expenses + Road Expenses + Commissions (nylon EXCLUDED on purpose).
 * Gross Income = Total Price − Total Expenses.
 * Cash Left = Total Cash Received − Factory Expenses (transfers and road expenses are NOT subtracted here).
 */
export function calcCompanyWeekSummary(
  perWorkerTotals: WeekTotals[],
  factoryExpenses: number,
  nylonRollExpenses: number
): CompanyWeekSummary {
  const sum = (fn: (t: WeekTotals) => number) => perWorkerTotals.reduce((a, t) => a + fn(t), 0);
  const totalPrice = sum((t) => t.price);
  const totalCash = sum((t) => t.cash);
  const totalTransfer = sum((t) => t.transfer);
  const totalOutstanding = sum((t) => t.outstanding);
  const totalCommission = sum((t) => t.commission);
  const totalRoadExpenses = sum((t) => t.roadExpenses);

  const totalExpenses = factoryExpenses + totalRoadExpenses + totalCommission;
  const grossIncome = totalPrice - totalExpenses;
  const cashLeft = totalCash - factoryExpenses;

  return {
    totalPrice,
    totalCash,
    totalTransfer,
    totalOutstanding,
    totalCommission,
    totalRoadExpenses,
    factoryExpenses,
    nylonRollExpenses,
    totalExpenses,
    grossIncome,
    cashLeft,
  };
}

/** Converts a Postgres `numeric` column (returned as a string) to a JS number safely. */
export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseFloat(v);
}
