import { JobPostingBoard } from "@/components/job-posting/job-posting-board";
import { AppHeader } from "@/components/layout/app-header";

export default function BoardPage() {
  return (
    <>
      <AppHeader title="지원 현황" />
      <JobPostingBoard />
    </>
  );
}
