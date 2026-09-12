import { type NextRequest } from "next/server";
import { redirectAfterPost } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirectAfterPost(new URL("/login", request.nextUrl.origin));
}
