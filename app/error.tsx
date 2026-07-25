"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="status-page page-shell">
      <p className="eyebrow">SOMETHING INTERRUPTED THE ARCHIVE</p>
      <h1>这一页暂时没能展开。</h1>
      <p>数据仍然安全保存在档案中，可以重新加载后再试。</p>
      <Button onClick={reset}>重新加载</Button>
    </main>
  );
}
