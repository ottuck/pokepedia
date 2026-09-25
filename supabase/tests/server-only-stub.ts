// Tests import server modules directly; the real "server-only" throws outside React Server
// Components, so it is aliased to this no-op in vitest.config.mts and vitest.db.config.mts.
export {};
