import type { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { AppHeader } from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "대시보드 · Regroove",
};

export default function DashboardPage() {
  return (
    <>
      <AppHeader title="대시보드" />
      <DashboardOverview />
    </>
  );
}
