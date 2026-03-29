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
    credits: 500,
    priceCents: 900,
    perCreditCost: "$0.018",
    proDays: 30,
  },
  team: {
    id: "team",
    name: "Team",
    credits: 10_000,
    priceCents: 12_900,
    perCreditCost: "$0.013",
    proDays: 180,
  },
} as const;

function run(): void {
  const packs = listPublicCheckoutPacks(PACKS);

  assert.deepEqual(packs, [
    {
      id: "starter",
      name: "Starter",
      credits: 500,
      price: "$9",
      priceCents: 900,
      perCreditCost: "$0.018",
      proDays: 30,
    },
    {
      id: "team",
      name: "Team",
      credits: 10000,
      price: "$129",
      priceCents: 12900,
      perCreditCost: "$0.013",
      proDays: 180,
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
