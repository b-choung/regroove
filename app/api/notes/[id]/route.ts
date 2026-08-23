import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { internalError, notFound, requireUser } from "@/lib/api/http";
import { deleteNote } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/notes/[id]">,
) {
  const { response } = await requireUser();
  if (response) return response;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) {
    return notFound("요청한 메모를 찾을 수 없습니다.");
  }

  try {
    const client = await createClient();
    // 남의 메모는 RLS가 걸러 0행이 되고, 없는 메모와 같은 404가 된다.
    const deleted = await deleteNote(client, id);
    if (!deleted) return notFound("요청한 메모를 찾을 수 없습니다.");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(`DELETE /api/notes/${id}`, error);
  }
}
