import { NextResponse, type NextRequest } from "next/server";
import { internalError, parseJsonBody, requireUser } from "@/lib/api/http";
import { parseJobPosting } from "@/lib/parsing/parse-job-posting";
import { parseRequestSchema } from "@/types/parsing";

/**
 * 공고 URL 파싱. (폴백 체인: 메타데이터 → Claude → 수동 입력)
 *
 * 파싱 실패는 200으로 돌려준다. 사용자 입장에서 "실패"가 아니라 "일부만 채웠으니
 * 나머지는 직접 입력" 상태이고, 응답의 missing/warnings가 그 안내를 담는다.
 * 로그인 사용자만 호출할 수 있게 막아 둔다 — 아무나 서버로 외부 페이지를
 * 대신 긁게 하는 공개 프록시가 되면 안 된다.
 */
export async function POST(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const body = await parseJsonBody(request, parseRequestSchema);
  if (body.response) return body.response;

  try {
    const parsed = await parseJobPosting(body.data.url);
    return NextResponse.json({ parsed });
  } catch (error) {
    return internalError("POST /api/parse", error);
  }
}
