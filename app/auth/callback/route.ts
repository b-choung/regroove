import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth(매직링크/OAuth) 리다이렉트 착지점.
 * 쿼리로 넘어온 code를 세션 쿠키로 교환한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // 원문 메시지를 쿼리로 넘기지 않는다. 로그인 화면이 URL의 텍스트를 그대로
    // 보여주게 되면 남이 만든 링크로 아무 문구나 띄울 수 있다(피싱).
    console.error(`[auth] 코드 교환 실패 — ${error.message}`);
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // open redirect 방지: 내부 경로만 허용한다.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
