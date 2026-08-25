import { apiRequest } from "@/lib/api/request";
import type { ParsedJobPosting } from "@/types/parsing";

/**
 * 공고 URL 파싱 요청. 부분 실패도 200으로 오므로 missing/warnings를 확인해야 한다.
 *
 * 서버가 외부 페이지 fetch(10초)와 Claude 추출(60초)을 순서대로 하므로 기본
 * 타임아웃(15초)으로는 정상 응답을 끊어버린다. 서버 상한보다 살짝 길게 잡는다.
 */
const PARSE_TIMEOUT_MS = 75_000;

export async function parseUrl(url: string): Promise<ParsedJobPosting> {
  const { parsed } = await apiRequest<{ parsed: ParsedJobPosting }>(
    "/api/parse",
    {
      method: "POST",
      body: JSON.stringify({ url }),
      timeoutMs: PARSE_TIMEOUT_MS,
    },
  );
  return parsed;
}
