import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  internalError,
  notFound,
  parseJsonBody,
  requireUser,
} from "@/lib/api/http";
import {
  DuplicateUrlError,
  deleteJobPosting,
  findJobPosting,
  updateJobPosting,
} from "@/lib/job-postings/repository";
import { toJobPosting } from "@/lib/mappers/job-posting";
import { createClient } from "@/lib/supabase/server";
import { jobPostingUpdateSchema } from "@/types/job-posting";

/**
 * uuid가 아닌 id를 그대로 쿼리에 넘기면 Postgres가 22P02로 실패해 500이 된다.
 * 존재하지 않는 공고와 결과가 같으므로 404로 취급한다.
 */
function parseId(id: string) {
  return z.uuid().safeParse(id).success ? id : null;
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/job-postings/[id]">,
) {
  const { response } = await requireUser();
  if (response) return response;

  const id = parseId((await ctx.params).id);
  if (!id) return notFound();

  try {
    const client = await createClient();
    const row = await findJobPosting(client, id);
    if (!row) return notFound();
    return NextResponse.json({ jobPosting: toJobPosting(row) });
  } catch (error) {
    return internalError(`GET /api/job-postings/${id}`, error);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/job-postings/[id]">,
) {
  const { user, response } = await requireUser();
  if (response) return response;

  const id = parseId((await ctx.params).id);
  if (!id) return notFound();

  const body = await parseJsonBody(request, jobPostingUpdateSchema);
  if (body.response) return body.response;

  try {
    const client = await createClient();
    const result = await updateJobPosting(client, user.id, id, body.data);

    if (result.kind === "not_found") return notFound();
    if (result.kind === "conflict") {
      // 최신 상태를 함께 돌려줘서, 클라이언트가 롤백 대신 서버 값으로 맞출 수 있게 한다.
      return apiError(
        409,
        "conflict",
        "다른 곳에서 먼저 수정된 공고입니다. 최신 내용으로 갱신했습니다.",
        { jobPosting: toJobPosting(result.row) },
      );
    }

    return NextResponse.json({ jobPosting: toJobPosting(result.row) });
  } catch (error) {
    if (error instanceof DuplicateUrlError) {
      return apiError(409, "duplicate_url", error.message);
    }
    return internalError(`PATCH /api/job-postings/${id}`, error);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/job-postings/[id]">,
) {
  const { response } = await requireUser();
  if (response) return response;

  const id = parseId((await ctx.params).id);
  if (!id) return notFound();

  try {
    const client = await createClient();
    const deleted = await deleteJobPosting(client, id);
    if (!deleted) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(`DELETE /api/job-postings/${id}`, error);
  }
}
