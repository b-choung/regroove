/**
 * 채용 공고 페이지 가져오기.
 *
 * 클라이언트가 외부 사이트를 직접 호출하면 CORS에 막히므로 서버가 대신 받아온다.
 * 그런데 "사용자가 준 URL을 서버가 요청한다"는 건 SSRF 통로이기도 해서,
 * 내부망 주소를 막고 리다이렉트를 직접 따라가며 매 홉을 다시 검사한다.
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/**
 * 봇임을 숨기지 않는다. 이 UA를 막는 사이트는 402/403이 오고,
 * 파싱 체인이 수동 입력 단계로 내려간다.
 */
const USER_AGENT =
  "Mozilla/5.0 (compatible; RegrooveBot/1.0; +https://github.com/lunabright/regroove)";

export type FetchFailureReason =
  "blocked_host" | "network" | "status" | "content_type" | "too_many_redirects";

export class PageFetchError extends Error {
  constructor(
    readonly reason: FetchFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "PageFetchError";
  }
}

export interface FetchedPage {
  html: string;
  /** 본문이 MAX_BYTES에서 잘렸는지. 잘렸으면 사용자에게 알린다. */
  truncated: boolean;
  finalUrl: string;
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  let current = assertFetchableUrl(url);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await request(current);

    // 리다이렉트를 수동으로 따라가는 이유: redirect: "follow"로 맡기면
    // 공개 URL이 내부망으로 리다이렉트해도 검사할 기회가 없다.
    if (isRedirect(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new PageFetchError("status", "리다이렉트 대상이 없습니다.");
      }
      current = assertFetchableUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new PageFetchError(
        "status",
        `페이지를 가져오지 못했습니다. (HTTP ${response.status})`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new PageFetchError(
        "content_type",
        `HTML이 아닌 응답입니다. (${contentType || "content-type 없음"})`,
      );
    }

    const { text, truncated } = await readCapped(response);
    return { html: text, truncated, finalUrl: current };
  }

  throw new PageFetchError("too_many_redirects", "리다이렉트가 너무 많습니다.");
}

async function request(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        // 한국 채용 사이트가 많으므로 한국어 페이지를 우선 요청한다.
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "페이지 응답이 너무 느립니다."
        : "페이지에 연결하지 못했습니다.";
    throw new PageFetchError("network", message);
  }
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

/**
 * 사용자가 준 URL이 외부 웹 주소인지 확인한다.
 * DNS까지 확인하지는 않으므로(내부 IP로 해석되는 공개 도메인은 통과) 완전한
 * 차단은 아니지만, 흔한 SSRF 표적(localhost·사설망·클라우드 메타데이터)을 막는다.
 */
export function assertFetchableUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PageFetchError("blocked_host", "올바른 URL이 아닙니다.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PageFetchError(
      "blocked_host",
      "http/https 주소만 가져올 수 있습니다.",
    );
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new PageFetchError(
      "blocked_host",
      "내부망 주소는 가져올 수 없습니다.",
    );
  }

  return parsed.toString();
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host.startsWith("fd") ||
    host.startsWith("fe80:")
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const [a, b] = ipv4.slice(1).map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // 클라우드 메타데이터
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** 본문을 MAX_BYTES까지만 읽는다. 거대한 페이지가 서버 메모리를 먹지 않게. */
async function readCapped(
  response: Response,
): Promise<{ text: string; truncated: boolean }> {
  const body = response.body;
  if (!body) return { text: "", truncated: false };

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  let truncated = false;

  try {
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;

      bytes += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));
    }
    truncated = bytes >= MAX_BYTES;
  } finally {
    await reader.cancel().catch(() => {});
  }

  chunks.push(decoder.decode());
  return { text: chunks.join(""), truncated };
}
