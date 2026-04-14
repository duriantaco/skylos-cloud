import assert from "node:assert/strict";
import {
  buildBillingSuccessUrl,
  invalidPackIdMessage,
  isValidPackId,
  listPublicCheckoutPacks,
} from "../src/lib/billing-checkout";

const PACKS = {
  starter: {
    id: "starter",
    name: "Starter",
    credits: 50,
    priceCents: 900,
    perCreditCost: "$0.180",
  },
  team: {
    id: "team",
    name: "Team",
    credits: 1_000,
    priceCents: 12_900,
    perCreditCost: "$0.129",
  },
} as const;

function run(): void {
  const packs = listPublicCheckoutPacks(PACKS);

  assert.deepEqual(packs, [
    {
      id: "starter",
      name: "Starter",
      credits: 50,
      price: "$9",
      priceCents: 900,
      perCreditCost: "$0.180",
    },
    {
      id: "team",
      name: "Team",
      credits: 1000,
      price: "$129",
      priceCents: 12900,
      perCreditCost: "$0.129",
    },
  ]);

  assert.equal(isValidPackId("starter", PACKS), true);
  assert.equal(isValidPackId("scale", PACKS), false);
  assert.equal(
    invalidPackIdMessage(PACKS),
    "Invalid pack_id. Must be one of: starter, team"
  );
  assert.equal(
    buildBillingSuccessUrl("https://skylos.dev/", "team"),
    "https://skylos.dev/dashboard/billing?success=true&pack=team"
  );
  assert.equal(
    buildBillingSuccessUrl("https://skylos.dev", "team pack"),
    "https://skylos.dev/dashboard/billing?success=true&pack=team%20pack"
  );

  console.log("verify-billing-checkout: ok");
}

run();
