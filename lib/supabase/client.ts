"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * 브라우저(클라이언트 컴포넌트) 전용 Supabase 클라이언트.
 * createBrowserClient 내부에서 싱글턴을 유지하므로 매번 호출해도 안전하다.
 */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
