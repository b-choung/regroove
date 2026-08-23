/**
 * API Route ↔ 클라이언트가 공유하는 에러 규약.
 *
 * 서버 전용 모듈(`lib/api/http.ts`)은 next/headers를 끌어오므로, 클라이언트가
 * 참조해야 하는 타입과 에러 클래스만 이 파일에 따로 둔다.
 */

export type ApiErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "not_found"
  | "conflict"
  | "duplicate_url"
  | "internal_error";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** invalid_request일 때 필드별 메시지. 폼에서 인라인 에러로 보여준다. */
    fields?: Record<string, string[]>;
  };
}

/** API Route가 반환한 실패. status code 대신 `code`로 분기한다. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;
  /** 응답 본문 전체. 409 conflict의 최신 공고처럼 부가 데이터가 실려 온다. */
  readonly body: unknown;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: { fields?: Record<string, string[]>; body?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = options.fields;
    this.body = options.body;
  }

  /**
   * 실패 응답을 ApiError로 바꾼다.
   * 프록시나 런타임 오류로 JSON이 아닌 응답이 올 수 있으므로 파싱 실패도 흡수한다.
   */
  static async fromResponse(response: Response): Promise<ApiError> {
    const body: unknown = await response.json().catch(() => null);
    const parsed = isApiErrorBody(body) ? body.error : null;

    return new ApiError(
      response.status,
      parsed?.code ?? "internal_error",
      parsed?.message ?? "요청을 처리하지 못했습니다.",
      { fields: parsed?.fields, body },
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiErrorBody).error?.code === "string"
  );
}
