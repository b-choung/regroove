import { ApiError } from "@/lib/api/errors";

/**
 * 자체 API Route 호출용 fetch 래퍼.
 *
 * 실패 응답은 전부 ApiError로 바꿔 던지므로, 호출부는 성공 경로만 다루고
 * 에러는 `code`로 분기한다.
 */

/**
 * 기본 타임아웃.
 *
 * 타임아웃이 없으면 서버가 응답을 늦게 주는 동안 화면이 "저장 중..."에 갇힌다.
 * 특히 공고 파싱은 서버 쪽 상한만 60초라 사용자가 그만큼 기다릴 수 있었다.
 * 오래 걸리는 요청은 호출부가 timeoutMs로 늘린다.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiRequestInit extends RequestInit {
  timeoutMs?: number;
}

export async function apiRequest<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init ?? {};

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      signal: AbortSignal.timeout(timeoutMs),
      headers: rest.body
        ? { "content-type": "application/json", ...rest.headers }
        : rest.headers,
    });
  } catch (cause) {
    // 네트워크 단절·타임아웃도 ApiError로 감싼다. 그대로 두면 화면에
    // "Failed to fetch" 같은 영어 메시지가 그대로 노출된다.
    throw toTransportError(cause, timeoutMs);
  }

  if (!response.ok) throw await ApiError.fromResponse(response);
  // 204 No Content(삭제)는 본문이 없어 json() 파싱이 실패한다.
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

function toTransportError(cause: unknown, timeoutMs: number): ApiError {
  const isTimeout = cause instanceof Error && cause.name === "TimeoutError";

  return isTimeout
    ? new ApiError(
        408,
        "timeout",
        `응답이 ${Math.round(timeoutMs / 1000)}초를 넘어 요청을 중단했습니다. 잠시 후 다시 시도해주세요.`,
        { body: null },
      )
    : new ApiError(
        0,
        "network",
        "서버에 연결하지 못했습니다. 네트워크 상태를 확인해주세요.",
        { body: null },
      );
}
