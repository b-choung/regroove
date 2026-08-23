import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 칸반보드는 낙관적 업데이트로 즉시 반영되므로
        // 포커스 복귀마다 refetch 하면 오히려 카드가 튀어 보인다.
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * 서버에서는 요청마다 새 QueryClient를, 브라우저에서는 싱글턴을 반환한다.
 * (브라우저에서 매번 새로 만들면 suspense 중 리렌더에 캐시가 날아간다.)
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
