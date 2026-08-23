import { NextResponse, type NextRequest } from "next/server";
import { internalError, parseJsonBody, requireUser } from "@/lib/api/http";
import { toUserSkillProfile } from "@/lib/mappers/job-posting";
import { findSkillProfile, upsertSkillProfile } from "@/lib/skills/repository";
import { createClient } from "@/lib/supabase/server";
import { userSkillProfileInputSchema } from "@/types/job-posting";

/**
 * 내 스킬 프로필. 사용자당 1행이라 컬렉션이 아니라 단일 리소스로 다룬다.
 * 아직 저장한 적이 없으면 GET은 null을 준다(404가 아니다 — 정상 초기 상태).
 */
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    const client = await createClient();
    const row = await findSkillProfile(client, user.id);
    return NextResponse.json({
      skillProfile: row ? toUserSkillProfile(row) : null,
    });
  } catch (error) {
    return internalError("GET /api/skill-profile", error);
  }
}

export async function PUT(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await parseJsonBody(request, userSkillProfileInputSchema);
  if (body.response) return body.response;

  try {
    const client = await createClient();
    const row = await upsertSkillProfile(client, user.id, body.data);
    return NextResponse.json({ skillProfile: toUserSkillProfile(row) });
  } catch (error) {
    return internalError("PUT /api/skill-profile", error);
  }
}
