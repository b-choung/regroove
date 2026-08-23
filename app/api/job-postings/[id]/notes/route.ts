import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  internalError,
  notFound,
  parseJsonBody,
  requireUser,
} from "@/lib/api/http";
import { findJobPosting } from "@/lib/job-postings/repository";
import { toNote } from "@/lib/mappers/job-posting";
import { createNote, listNotes } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/server";
import { noteInputSchema } from "@/types/job-posting";

/**
 * 공고에 달린 메모.
 *
 * notes 자체는 RLS가 부모 공고 소유권으로 지켜주지만, 그것만 믿으면 남의 공고
 * id로 요청했을 때 "빈 목록"이 돌아와 없는 공고와 구분되지 않는다. 그래서
 * 부모 공고를 먼저 확인해 404를 명확히 돌려준다.
 */
function parseId(id: string) {
  return z.uuid().safeParse(id).success ? id : null;
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/job-postings/[id]/notes">,
) {
  const { response } = await requireUser();
  if (response) return response;

  const jobPostingId = parseId((await ctx.params).id);
  if (!jobPostingId) return notFound();

  try {
    const client = await createClient();
    if (!(await findJobPosting(client, jobPostingId))) return notFound();

    const rows = await listNotes(client, jobPostingId);
    return NextResponse.json({ notes: rows.map(toNote) });
  } catch (error) {
    return internalError(`GET /api/job-postings/${jobPostingId}/notes`, error);
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/job-postings/[id]/notes">,
) {
  const { response } = await requireUser();
  if (response) return response;

  const jobPostingId = parseId((await ctx.params).id);
  if (!jobPostingId) return notFound();

  const body = await parseJsonBody(request, noteInputSchema);
  if (body.response) return body.response;

  try {
    const client = await createClient();
    if (!(await findJobPosting(client, jobPostingId))) return notFound();

    const row = await createNote(client, jobPostingId, body.data);
    return NextResponse.json({ note: toNote(row) }, { status: 201 });
  } catch (error) {
    return internalError(`POST /api/job-postings/${jobPostingId}/notes`, error);
  }
}
