import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * API Route 공용 응답/에러 규약.
 *
 * 클라이언트(`lib/api/job-postings.ts`)가 status code 대신 `error.code`로
 * 분기하므로, 새 실패 케이스를 만들 때는 반드시 여기에 코드를 추가한다.
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

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: { code, message }, ...extra }, { status });
}

export function unauthorized() {
  return apiError(401, "unauthorized", "로그인이 필요합니다.");
}

export function notFound(message = "요청한 공고를 찾을 수 없습니다.") {
  return apiError(404, "not_found", message);
}

/** 예상하지 못한 서버/DB 오류. 원문은 서버 로그로만 남기고 클라이언트에는 감춘다. */
export function internalError(context: string, cause: unknown) {
  console.error(`[api] ${context}`, cause);
  return apiError(
    500,
    "internal_error",
    "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
  );
}

/**
 * 로그인 사용자를 확인한다.
 * 미인증이면 그대로 반환할 수 있는 401 응답을 함께 돌려준다.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: unauthorized() } as const;
  return { user, response: null } as const;
}

/**
 * 요청 본문을 스키마로 검증한다.
 * JSON 파싱 실패와 검증 실패를 모두 400 invalid_request로 묶는다.
 */
export async function parseJsonBody<T extends ZodType>(
  request: Request,
  schema: T,
): Promise<
  | { data: z.infer<T>; response: null }
  | { data: null; response: NextResponse<ApiErrorBody> }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      response: apiError(
        400,
        "invalid_request",
        "JSON 본문을 읽을 수 없습니다.",
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    return {
      data: null,
      response: NextResponse.json(
        {
          error: {
            code: "invalid_request" as const,
            message: "입력값을 확인해주세요.",
            fields: fieldErrors as Record<string, string[]>,
          },
        },
        { status: 400 },
      ),
    };
  }

  return { data: result.data as z.infer<T>, response: null };
}
