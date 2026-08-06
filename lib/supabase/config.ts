export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

const SUPABASE_CONFIG_ERROR =
  "Supabase 配置缺失或格式不正确，请检查 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。";

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(SUPABASE_CONFIG_ERROR);
    }
  } catch {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return { url, publishableKey };
}
