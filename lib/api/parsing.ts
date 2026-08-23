import { apiRequest } from "@/lib/api/request";
import type { ParsedJobPosting } from "@/types/parsing";

/** 공고 URL 파싱 요청. 부분 실패도 200으로 오므로 missing/warnings를 확인해야 한다. */
export async function parseUrl(url: string): Promise<ParsedJobPosting> {
  const { parsed } = await apiRequest<{ parsed: ParsedJobPosting }>(
    "/api/parse",
    { method: "POST", body: JSON.stringify({ url }) },
  );
  return parsed;
}
