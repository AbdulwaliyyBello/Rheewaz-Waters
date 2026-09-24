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
export type CalculatedDay = RawDay & { price: number; outstanding: number; commission: number };

export function calcDay(d: RawDay): CalculatedDay {
  const price = d.bags * PRICE_PER_BAG;
  const outstanding = price - d.cash - d.transfer - d.roadExpenses;
  const commission = d.bags * COMMISSION_PER_BAG;
  return { ...d, price, outstanding, commission };
}

export type WeekTotals = {
  bags: number; price: number; cash: number; transfer: number;
  roadExpenses: number; outstanding: number; commission: number;
};

export function calcWeekTotals(days: RawDay[]): { rows: CalculatedDay[]; totals: WeekTotals } {
  const rows = days.map(calcDay);
  const totals = rows.reduce<WeekTotals>((a, r) => ({
    bags: a.bags + r.bags, price: a.price + r.price, cash: a.cash + r.cash,
    transfer: a.transfer + r.transfer, roadExpenses: a.roadExpenses + r.roadExpenses,
    outstanding: a.outstanding + r.outstanding, commission: a.commission + r.commission,
  }), { bags: 0, price: 0, cash: 0, transfer: 0, roadExpenses: 0, outstanding: 0, commission: 0 });
  return { rows, totals };
}

/** Commission Payable = Current Week Commission − Previous Week Outstanding (undiminished by repayments). */
export function calcCommissionPayable(weekCommission: number, previousWeekOutstanding: number): number {
  return weekCommission - previousWeekOutstanding;
}

/**
 * Phase 2: This Week's Entitlement = Current Week Commission − REMAINING
 * Previous Outstanding (i.e. after subtracting confirmed repayments once,
 * not the raw previous outstanding). Repayments reduce the balance the
 * worker owes; they never touch the historical commission/outstanding
 * figures themselves.
 */
export function calcEntitlement(
  weekCommission: number,
  previousOutstanding: number,
  repaymentsMade: number
): { remainingOutstanding: number; entitlement: number } {
  const remainingOutstanding = Math.max(0, previousOutstanding - repaymentsMade);
  const entitlement = weekCommission - remainingOutstanding;
  return { remainingOutstanding, entitlement };
}

export type CompanyWeekSummary = {
  totalPrice: number; totalCash: number; totalTransfer: number; totalOutstanding: number;
  totalCommission: number; totalRoadExpenses: number; factoryExpenses: number;
  nylonRollExpenses: number; totalExpenses: number; grossIncome: number; cashLeft: number;
};

export function calcCompanyWeekSummary(
  perWorkerTotals: WeekTotals[], factoryExpenses: number, nylonRollExpenses: number
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
    totalPrice, totalCash, totalTransfer, totalOutstanding, totalCommission, totalRoadExpenses,
    factoryExpenses, nylonRollExpenses, totalExpenses, grossIncome, cashLeft,
  };
}

export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseFloat(v);
}

/* ============================================================
   PHASE 2 — TRUCK BAG-COUNTING RULES ENGINE
   This is deterministic arithmetic ONLY. It takes counts as input
   (rows/bags actually observed — by a human Boss today, or eventually
   by a real vision model) and applies the business rules from the spec.
   It does not itself look at images or invent counts — see AI_HONESTY
   note in README.
   ============================================================ */
export type TruckGeometry = { bagsAcross: number; bagLines: number; bonusBags: number; bonusThreshold: number };

export const DYNA_GEOMETRY: TruckGeometry = { bagsAcross: 7, bagLines: 3, bonusBags: 6, bonusThreshold: 125 };
export const HIJET_GEOMETRY: TruckGeometry = { bagsAcross: 6, bagLines: 3, bonusBags: 4, bonusThreshold: 100 };

/**
 * Physical count from observed structure:
 * completeRows × (bagsAcross × bagLines) + incompleteRowBags + topBags.
 * Never assumes an incomplete row is full, and never assumes a fixed
 * number of top bags — both must be supplied as actually-observed counts.
 */
export function calcPhysicalCount(
  geometry: TruckGeometry,
  completeRows: number,
  incompleteRowBags: number,
  topBags: number = 0
): number {
  const rowSize = geometry.bagsAcross * geometry.bagLines;
  return completeRows * rowSize + incompleteRowBags + topBags;
}

/**
 * newBagsLoaded = departure − arrival (never treat all departure bags as new;
 * arrival bags may be carried over from a previous trip).
 * bonus applies only once newBagsLoaded crosses the truck's threshold.
 * companyBags = newBagsLoaded − bonus.
 */
export function calcTripBagCounts(
  geometry: TruckGeometry,
  physicalArrivalBags: number,
  physicalDepartureBags: number
): { newBagsLoaded: number; bonusBags: number; companyBags: number } {
  const newBagsLoaded = physicalDepartureBags - physicalArrivalBags;
  const bonusBags = newBagsLoaded >= geometry.bonusThreshold ? geometry.bonusBags : 0;
  const companyBags = newBagsLoaded - bonusBags;
  return { newBagsLoaded, bonusBags, companyBags };
}

export function geometryForTruckType(truckType: "dyna" | "hijet"): TruckGeometry {
  return truckType === "dyna" ? DYNA_GEOMETRY : HIJET_GEOMETRY;
}
