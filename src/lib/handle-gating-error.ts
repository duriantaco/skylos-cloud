export type GatingError =
  | { type: "credits_required"; creditsRequired: number; buyUrl: string }
  | { type: "plan_required"; requiredPlan: string; buyUrl: string }
  | { type: "unknown"; message: string };


export async function parseGatingError(response: Response): Promise<GatingError | null> {
  if (response.ok) 
    return null;

  try {
    const data = await response.json();

    if (response.status === 402) {
      return {
        type: "credits_required",
        creditsRequired: data.credits_required || 0,
        buyUrl: data.buy_url || "/dashboard/billing",
      };
    }

    if (response.status === 403 && data.code === "PLAN_REQUIRED") {
      return {
        type: "plan_required",
        requiredPlan: data.required_plan || "pro",
        buyUrl: data.buy_url || "/dashboard/billing",
      };
    }

    return { type: "unknown", message: data.error || "An error occurred" };
  } catch {
    return { type: "unknown", message: "Failed to parse error response" };
  }
}
