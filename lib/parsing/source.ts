import type { JobSource } from "@/types/job-posting";

/**
 * URL의 호스트로 채용 사이트를 판별한다.
 * 아는 사이트가 아니면 "manual"로 두고, 사용자가 폼에서 바꿀 수 있게 한다.
 */
const SOURCE_HOSTS: ReadonlyArray<{ pattern: RegExp; source: JobSource }> = [
  { pattern: /(^|\.)saramin\.co\.kr$/, source: "saramin" },
  { pattern: /(^|\.)wanted\.co\.kr$/, source: "wanted" },
  { pattern: /(^|\.)jobplanet\.co\.kr$/, source: "jobplanet" },
];

export function detectSource(url: string): JobSource {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "manual";
  }

  return (
    SOURCE_HOSTS.find(({ pattern }) => pattern.test(hostname))?.source ??
    "manual"
  );
}
