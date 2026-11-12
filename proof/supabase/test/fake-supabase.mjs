// A tiny stand-in for supabase-js, backed by plain objects, for the webhook test.
export const DB = (globalThis.__DB ||= { profiles: {}, billing: {} });
const matches = (r, filters) => filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'neq' ? r[c] !== v : (r[c] ?? null) === null));
export function createClient() {
  return {
    from(table) {
      const rows = DB[table]; const filters = [];
      const api = {
        select() { return api; },
        eq(c, v) { filters.push(['eq', c, v]); return api; },
        neq(c, v) { filters.push(['neq', c, v]); return api; },
        is(c, v) { filters.push(['is', c, v]); return api; },
        async maybeSingle() { const r = Object.values(rows).find((x) => matches(x, filters)); return { data: r ? { ...r } : null }; },
        update(patch) {
          const apply = () => { const hit = Object.values(rows).filter((x) => matches(x, filters)); hit.forEach((x) => Object.assign(x, patch)); return hit; };
          const chain = {
            eq(c, v) { filters.push(['eq', c, v]); return chain; },
            is(c, v) { filters.push(['is', c, v]); return chain; },
            select() { const hit = apply(); return Promise.resolve({ data: hit.map((x) => ({ id: x.id || x.user_id })) }); },
            then(res, rej) { apply(); return Promise.resolve({}).then(res, rej); },
          };
          return chain;
        },
        async upsert(row) { const key = row.user_id ?? row.id; rows[key] = { ...(rows[key] || {}), ...row }; return {}; },
      };
      return api;
    },
  };
}
