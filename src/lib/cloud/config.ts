// Where the StockNest cloud lives. These two values are public by design (they ship inside the
// website); what each person can read or change is decided by the database's security rules.
// A build can point elsewhere with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "https://dfvbyxwkrncrhzwbsdsr.supabase.co";
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_FPKpAOV3wjeBBQadLGkCuA_MSZM_jnL";

/** Cloud features are off in tests unless a test turns them on */
export const cloudConfigured = () => !!SUPABASE_URL && !!SUPABASE_KEY && import.meta.env.MODE !== "test";
