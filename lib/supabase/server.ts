import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

/**
 * 서버(Server Component / API Route / Server Action) 전용 Supabase 클라이언트.
 *
 * 요청마다 새로 만들어야 하므로 모듈 스코프에 캐싱하지 않는다.
 * Server Component에서는 쿠키를 쓸 수 없어 setAll이 throw하는데,
 * 세션 갱신은 proxy.ts가 담당하므로 무시해도 안전하다.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component에서 호출된 경우. proxy.ts가 세션을 갱신한다.
          }
        },
      },
    },
  );
}

/** 로그인한 사용자를 반환한다. 미인증이면 null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
