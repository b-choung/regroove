import type { SupabaseClient } from "@supabase/supabase-js";
import { toUserSkillProfileUpsert } from "@/lib/mappers/job-posting";
import type { Database, UserSkillProfileRow } from "@/types/database";
import type { UserSkillProfileInput } from "@/types/job-posting";

/** user_skill_profiles 데이터 접근 계층. 사용자당 1행(user_id가 PK)이다. */

type Client = SupabaseClient<Database>;

export async function findSkillProfile(
  client: Client,
  userId: string,
): Promise<UserSkillProfileRow | null> {
  const { data, error } = await client
    .from("user_skill_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** 프로필은 만들기/수정을 구분할 이유가 없어 upsert 하나로 처리한다. */
export async function upsertSkillProfile(
  client: Client,
  userId: string,
  input: UserSkillProfileInput,
): Promise<UserSkillProfileRow> {
  const { data, error } = await client
    .from("user_skill_profiles")
    .upsert(toUserSkillProfileUpsert(input, userId), { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
