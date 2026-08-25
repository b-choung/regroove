import { Button } from "@/components/ui/button";

/**
 * 가입 없이 둘러보기.
 *
 * 서버 컴포넌트 + form POST라 클라이언트 JS 없이 동작한다. 비밀번호는
 * `/auth/demo`가 서버에서 읽으므로 화면에도, 번들에도 남지 않는다.
 */
export function DemoLogin() {
  return (
    <div className="space-y-2">
      <form action="/auth/demo" method="post">
        <Button type="submit" variant="outline" className="w-full">
          가입 없이 둘러보기
        </Button>
      </form>
      <p className="text-caption text-muted-foreground">
        예시 데이터가 담긴 데모 계정으로 접속합니다. 다른 방문자와 같은 계정을
        쓰므로 내용이 바뀌어 있을 수 있습니다.
      </p>
    </div>
  );
}
