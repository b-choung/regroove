import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import type { JobPosting } from "@/types/job-posting";
import { useMoveJobPosting } from "./use-job-postings";

/**
 * 낙관적 업데이트 검증.
 *
 * 드래그 제스처 자체(dnd-kit)는 jsdom에서 좌표·측정값이 없어 재현이 어렵다.
 * 대신 드롭 이후의 계약 — 캐시를 먼저 고치고, 실패하면 되돌린다 — 를 검증한다.
 */

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const card = (id: string, position: number, status: JobPosting["status"]) => ({
  id,
  userId: "99999999-9999-9999-9999-999999999999",
  url: null,
  company: "회사",
  title: `공고 ${id}`,
  deadline: null,
  requiredSkills: [],
  status,
  source: "manual" as const,
  rawContent: null,
  position,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

const initial: JobPosting[] = [
  card("a", 1024, "interested"),
  card("b", 2048, "interested"),
];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.jobPostings.list(), initial);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useMoveJobPosting(), { wrapper });
  const list = () =>
    queryClient.getQueryData<JobPosting[]>(queryKeys.jobPostings.list()) ?? [];

  return { result, list };
}

const movePlan = {
  status: "applied" as const,
  updates: [{ id: "a", position: 4096 }],
  rebalanced: false,
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("useMoveJobPosting", () => {
  it("서버 응답을 기다리지 않고 캐시를 먼저 고친다", async () => {
    // 응답을 붙잡아 두고, 그 사이 캐시가 이미 바뀌었는지 확인한다.
    let release: (() => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return Response.json({
          jobPosting: { ...card("a", 4096, "applied") },
        });
      }),
    );

    const { result, list } = setup();

    result.current.mutate({
      activeId: "a",
      plan: movePlan,
      expectedUpdatedAt: initial[0].updatedAt,
    });

    await waitFor(() => {
      const moved = list().find((item) => item.id === "a");
      expect(moved?.status).toBe("applied");
      expect(moved?.position).toBe(4096);
    });

    release?.();
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("요청이 실패하면 이전 상태로 되돌린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "internal_error", message: "서버 오류" } },
          { status: 500 },
        ),
      ),
    );

    const { result, list } = setup();

    result.current.mutate({
      activeId: "a",
      plan: movePlan,
      expectedUpdatedAt: initial[0].updatedAt,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const rolledBack = list().find((item) => item.id === "a");
    expect(rolledBack?.status).toBe("interested");
    expect(rolledBack?.position).toBe(1024);
  });

  it("충돌(409)이면 서버가 준 최신 위치로 맞춘다", async () => {
    const latest = {
      ...card("a", 8192, "interview"),
      updatedAt: "2026-08-05T00:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: { code: "conflict", message: "먼저 수정됨" },
            jobPosting: latest,
          },
          { status: 409 },
        ),
      ),
    );

    const { result, list } = setup();

    result.current.mutate({
      activeId: "a",
      plan: movePlan,
      expectedUpdatedAt: initial[0].updatedAt,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const reconciled = list().find((item) => item.id === "a");
    expect(reconciled?.status).toBe("interview");
    expect(reconciled?.position).toBe(8192);
  });

  it("재정렬이 필요하면 컬럼의 나머지 카드도 함께 보낸다", async () => {
    // 요청 본문을 확인해야 하므로 fetch 시그니처를 명시한 mock을 쓴다.
    const fetchMock = vi.fn<
      (path: string, init?: RequestInit) => Promise<Response>
    >(async () => Response.json({ jobPosting: card("a", 1024, "interested") }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = setup();

    result.current.mutate({
      activeId: "a",
      plan: {
        status: "interested",
        updates: [
          { id: "a", position: 1024 },
          { id: "b", position: 2048 },
        ],
        rebalanced: true,
      },
      expectedUpdatedAt: initial[0].updatedAt,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 이동한 카드에만 낙관적 잠금을 걸고, 위치 정리 요청에는 걸지 않는다.
    const bodies = fetchMock.mock.calls.map(
      (call) => JSON.parse(String(call[1]?.body)) as unknown,
    );
    expect(bodies[0]).toMatchObject({ expectedUpdatedAt: expect.any(String) });
    expect(bodies[1]).toEqual({ position: 2048 });
  });
});
