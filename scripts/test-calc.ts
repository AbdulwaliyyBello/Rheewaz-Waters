import {
  calcPhysicalCount, calcTripBagCounts, DYNA_GEOMETRY, HIJET_GEOMETRY,
  calcEntitlement, calcCommissionPayable,
} from "../src/lib/calc";

let pass = 0, fail = 0;
function check(name: string, actual: number, expected: number) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}: got ${actual}, expected ${expected}`);
  if (ok) pass++; else fail++;
}

// Test 1 — Daihatsu: 4 complete rows + 5 in incomplete row = 77
check("Test 1 (Daihatsu physical count)", calcPhysicalCount(HIJET_GEOMETRY, 4, 5), 77);

// Test 2 — Daihatsu top loading: 5 complete rows (90) + 14 top bags = 104
check("Test 2 (Daihatsu top-bag count)", calcPhysicalCount(HIJET_GEOMETRY, 5, 0, 14), 104);

// Test 3 — Daihatsu trip: arrival 77, departure 104 -> new 27, bonus 0, company 27
{
  const r = calcTripBagCounts(HIJET_GEOMETRY, 77, 104);
  check("Test 3 (Daihatsu new bags)", r.newBagsLoaded, 27);
  check("Test 3 (Daihatsu bonus)", r.bonusBags, 0);
  check("Test 3 (Daihatsu company bags)", r.companyBags, 27);
}

// Test 4 — Daihatsu bonus: new=104 -> bonus 4, company 100 (arrival 10, departure 114)
{
  const r = calcTripBagCounts(HIJET_GEOMETRY, 10, 114);
  check("Test 4 (Daihatsu new bags)", r.newBagsLoaded, 104);
  check("Test 4 (Daihatsu bonus)", r.bonusBags, 4);
  check("Test 4 (Daihatsu company bags)", r.companyBags, 100);
}

// Test 5 — Dyna: 6 complete rows (126) + incomplete row 5 = 131; arrival 10 -> departure 141
check("Test 5 (Dyna physical count)", calcPhysicalCount(DYNA_GEOMETRY, 6, 5), 131);
{
  const r = calcTripBagCounts(DYNA_GEOMETRY, 10, 141);
  check("Test 5 (Dyna new bags)", r.newBagsLoaded, 131);
  check("Test 5 (Dyna bonus)", r.bonusBags, 6);
  check("Test 5 (Dyna company bags)", r.companyBags, 125);
}

// Test 6 — Dyna threshold: new=124 -> bonus 0
{
  const r = calcTripBagCounts(DYNA_GEOMETRY, 0, 124);
  check("Test 6 (Dyna bonus at 124)", r.bonusBags, 0);
}

// Test 7 — Dyna threshold: new=125 -> bonus 6, company 119
{
  const r = calcTripBagCounts(DYNA_GEOMETRY, 0, 125);
  check("Test 7 (Dyna bonus at 125)", r.bonusBags, 6);
  check("Test 7 (Dyna company at 125)", r.companyBags, 119);
}

// Test 9 — Worker repayment: debt 5000, repay 2000 -> remaining 3000
{
  const { remainingOutstanding } = calcEntitlement(0, 5000, 2000);
  check("Test 9 (repayment remaining)", remainingOutstanding, 3000);
}

// Entitlement sanity: commission 7200, previous outstanding 2000, no repayment -> 5200
{
  const { entitlement } = calcEntitlement(7200, 2000, 0);
  check("Entitlement sanity (no repayment)", entitlement, 5200);
  check("calcCommissionPayable matches", calcCommissionPayable(7200, 2000), 5200);
}

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
