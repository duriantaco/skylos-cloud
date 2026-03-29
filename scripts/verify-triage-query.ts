import assert from "node:assert/strict";
import {
  fetchTriageFindings,
  TRIAGE_FINDINGS_SELECT,
} from "../src/lib/issue-groups/triage";

async function main() {
  let eqColumn = "";
  let eqValue = "";
  let orderColumn = "";
  let orderOptions: { ascending: boolean } | null = null;
  let limitValue = 0;

  const fakeSupabase = {
    from(table: string) {
      assert.equal(table, "findings");

      return {
        select(columns: string) {
          assert.equal(columns, TRIAGE_FINDINGS_SELECT);

          return {
            eq(column: string, value: string) {
              eqColumn = column;
              eqValue = value;

              return {
                order(columnName: string, options: { ascending: boolean }) {
                  orderColumn = columnName;
                  orderOptions = options;

                  return {
                    limit(count: number) {
                      limitValue = count;
                      return Promise.resolve({ data: [] });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  await fetchTriageFindings(fakeSupabase, "issue-group-123");

  assert.equal(eqColumn, "group_id");
  assert.equal(eqValue, "issue-group-123");
  assert.equal(orderColumn, "created_at");
  assert.deepEqual(orderOptions, { ascending: false });
  assert.equal(limitValue, 5);

  console.log("verify-triage-query: ok");
}

void main();
