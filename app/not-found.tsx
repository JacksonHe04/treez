import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="status-page page-shell">
      <p className="eyebrow">404 / LOST BETWEEN THE LEAVES</p>
      <h1>这片年轮里没有找到对应的记录。</h1>
      <p>它可能尚未加入 Treez，也可能已经更换了地址。</p>
      <div>
        <Button asChild>
          <Link href="/search">搜索公共档案</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </main>
  );
}
