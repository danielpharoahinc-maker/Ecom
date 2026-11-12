// Prices in cents (ZAR). Must match the plans created in the Paystack
// dashboard and PRICES in js/config.js.
export const PLANS = {
  monthly: { amount: 4900, days: 31, code: Deno.env.get('PAYSTACK_PLAN_MONTHLY') ?? '' },
  yearly: { amount: 39900, days: 366, code: Deno.env.get('PAYSTACK_PLAN_YEARLY') ?? '' },
} as const;
export type PlanName = keyof typeof PLANS;

export const planByCode = (code: string | undefined): PlanName | null =>
  (Object.keys(PLANS) as PlanName[]).find((k) => PLANS[k].code && PLANS[k].code === code) ?? null;

// The card check at the start of the free trial: R1, refunded straight away.
export const TRIAL_AUTH = 100;
export const TRIAL_DAYS = 30;
