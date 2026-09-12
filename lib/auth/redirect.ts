import { NextResponse } from "next/server";

/**
 * POST를 처리한 뒤 화면으로 보낼 때 쓰는 리다이렉트.
 *
 * NextResponse.redirect의 기본값은 307인데, 307은 "메서드를 유지하라"는 뜻이라
 * 브라우저가 목적지에 다시 POST를 보낸다. 목적지가 페이지면 POST 핸들러가 없어
 * 405가 난다(로그인·로그아웃이 이렇게 깨졌다). 303은 "결과는 다른 곳에 있으니
 * GET으로 가져가라"는 의미이고, POST/Redirect/GET 패턴이 쓰는 코드다.
 */
export function redirectAfterPost(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}
