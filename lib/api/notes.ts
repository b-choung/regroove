import { apiRequest } from "@/lib/api/request";
import type { Note, NoteInput } from "@/types/job-posting";

export async function fetchNotes(jobPostingId: string): Promise<Note[]> {
  const { notes } = await apiRequest<{ notes: Note[] }>(
    `/api/job-postings/${jobPostingId}/notes`,
  );
  return notes;
}

export async function createNote(
  jobPostingId: string,
  input: NoteInput,
): Promise<Note> {
  const { note } = await apiRequest<{ note: Note }>(
    `/api/job-postings/${jobPostingId}/notes`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  await apiRequest<void>(`/api/notes/${id}`, { method: "DELETE" });
}
