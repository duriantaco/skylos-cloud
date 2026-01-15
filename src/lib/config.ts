export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000',
  },
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  features: {
    devToggle: process.env.BETA_DEV_TOGGLE === 'true',
  },
} as const;

if (!config.supabase.url) 
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
if (!config.supabase.anonKey) 
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');