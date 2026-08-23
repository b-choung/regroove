"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseUrl } from "@/lib/api/parsing";
import type { ParsedJobPosting } from "@/types/parsing";

/**
 * URL 붙여넣기 → 자동 채우기.
 *
 * 공고 입력 폼과 별개의 form으로 둔다. 같은 form 안에 넣으면 URL 칸에서 엔터를
 * 쳤을 때 공고가 저장돼 버린다.
 */
export function UrlImport({
  onImported,
}: {
  onImported: (parsed: ParsedJobPosting) => void;
}) {
  const [url, setUrl] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: parseUrl,
    onSuccess: onImported,
    onError: (error) =>
      toast.error("공고를 불러오지 못했습니다.", {
        description: error.message,
      }),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (trimmed) mutate(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <Label htmlFor="import-url">공고 URL로 불러오기</Label>
      <div className="flex gap-2">
        <Input
          id="import-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.wanted.co.kr/wd/12345"
          disabled={isPending}
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          <DownloadIcon />
          {isPending ? "불러오는 중..." : "불러오기"}
        </Button>
      </div>
    </form>
  );
}
