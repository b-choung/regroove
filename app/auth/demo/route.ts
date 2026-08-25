import { NextResponse, type NextRequest } from "next/server";
import { demoCredentials } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 데모 계정으로 로그인. (POST 폼 하나로 동작 — 클라이언트 JS가 필요 없다)
 *
 * 매직링크는 메일함을 여는 단계가 있어서 처음 방문한 사람이 화면을 보기 전에
 * 이탈한다. 데모 계정은 그 단계를 없애는 용도이고, 비밀번호는 서버에만 둔다.
 * 본인 계정은 계속 매직링크로 들어온다.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const demo = demoCredentials();

  if (!demo) {
    return NextResponse.redirect(`${origin}/login?error=demo_unavailable`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: demo.DEMO_EMAIL,
    password: demo.DEMO_PASSWORD,
  });

  if (error) {
    // 계정이 없거나 비밀번호가 바뀐 상황. 원문은 로그로만 남긴다.
    console.error(`[auth] 데모 로그인 실패 — ${error.message}`);
    return NextResponse.redirect(`${origin}/login?error=demo_failed`);
  }

  return NextResponse.redirect(origin);
}
