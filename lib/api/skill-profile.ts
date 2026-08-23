import { apiRequest } from "@/lib/api/request";
import type {
  UserSkillProfile,
  UserSkillProfileInput,
} from "@/types/job-posting";

const PATH = "/api/skill-profile";

/** 아직 저장한 적이 없으면 null. */
export async function fetchSkillProfile(): Promise<UserSkillProfile | null> {
  const { skillProfile } = await apiRequest<{
    skillProfile: UserSkillProfile | null;
  }>(PATH);
  return skillProfile;
}

export async function saveSkillProfile(
  input: UserSkillProfileInput,
): Promise<UserSkillProfile> {
  const { skillProfile } = await apiRequest<{ skillProfile: UserSkillProfile }>(
    PATH,
    { method: "PUT", body: JSON.stringify(input) },
  );
  return skillProfile;
}
