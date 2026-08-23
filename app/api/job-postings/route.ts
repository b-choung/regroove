import { NextResponse, type NextRequest } from "next/server";
import {
  apiError,
  internalError,
  parseJsonBody,
  requireUser,
} from "@/lib/api/http";
import {
  DuplicateUrlError,
  createJobPosting,
  listJobPostings,
} from "@/lib/job-postings/repository";
import { toJobPosting } from "@/lib/mappers/job-posting";
import { createClient } from "@/lib/supabase/server";
import { jobPostingInputSchema } from "@/types/job-posting";

/** 로그인 사용자의 공고 전체 목록. 컬럼별 그룹핑은 클라이언트가 한다. */
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    const client = await createClient();
    const rows = await listJobPostings(client, user.id);
    return NextResponse.json({ jobPostings: rows.map(toJobPosting) });
  } catch (error) {
    return internalError("GET /api/job-postings", error);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await parseJsonBody(request, jobPostingInputSchema);
  if (body.response) return body.response;

  try {
    const client = await createClient();
    const row = await createJobPosting(client, user.id, body.data);
    return NextResponse.json(
      { jobPosting: toJobPosting(row) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateUrlError) {
      return apiError(409, "duplicate_url", error.message);
    }
    return internalError("POST /api/job-postings", error);
  }
}
