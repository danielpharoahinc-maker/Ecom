// Fake supabase-js admin client backed by plain objects.
export const DB = (globalThis.__DB ||= { profiles: {}, billing: {} });
export function createClient() {
  return { from(table) {
    const rows = DB[table]; let filt = null;
    const api = {
      select() { return api; },
      eq(col, val) { filt = [col, val]; return api; },
      async maybeSingle() { const r = Object.values(rows).find((x) => x[filt[0]] === filt[1]); return { data: r ?? null }; },
      update(patch) { return { eq: async (col, val) => { for (const r of Object.values(rows)) if (r[col] === val) Object.assign(r, patch); return {}; } }; },
      async upsert(row) { rows[row.user_id] = { ...(rows[row.user_id] || {}), ...row }; return {}; },
    };
    return api;
  } };
}
