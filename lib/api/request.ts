import { ApiError } from "@/lib/api/errors";

/**
 * 자체 API Route 호출용 fetch 래퍼.
 *
 * 실패 응답은 전부 ApiError로 바꿔 던지므로, 호출부는 성공 경로만 다루고
 * 에러는 `code`로 분기한다.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body
      ? { "content-type": "application/json", ...init.headers }
      : init?.headers,
  });

  if (!response.ok) throw await ApiError.fromResponse(response);
  // 204 No Content(삭제)는 본문이 없어 json() 파싱이 실패한다.
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
