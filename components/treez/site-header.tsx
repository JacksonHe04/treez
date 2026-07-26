import { Menu, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { domains } from "@/lib/treez/config";
import { treezLoginPath, treezLogoutPath } from "@/lib/auth/paths";

import { TreezLogo } from "./logo";

type Viewer = {
  id: string;
  username: string | null;
} | null;

function NavigationLinks({ close = false }: { close?: boolean }) {
  const Wrapper = close ? SheetClose : "span";
  return (
    <>
      {domains.map((domain) => (
        <Wrapper key={domain.id} asChild={close || undefined}>
          <Link href={domain.href}>{domain.label}</Link>
        </Wrapper>
      ))}
    </>
  );
}

export function SiteHeader({ viewer }: { viewer: Viewer }) {
  return (
    <header className="site-header">
      <div className="page-shell site-header__inner">
        <TreezLogo />
        <nav className="site-nav" aria-label="主要导航">
          <NavigationLinks />
        </nav>
        <form action="/search" className="site-search" role="search">
          <Search aria-hidden="true" size={16} />
          <input
            type="search"
            name="q"
            placeholder="搜索作品、创作者"
            aria-label="搜索作品与创作者"
          />
        </form>
        <div className="site-actions">
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href="/add">
              <Plus aria-hidden="true" />
              新增条目
            </Link>
          </Button>
          {viewer ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/me`}>{viewer.username ?? "我的鉴赏"}</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden lg:flex"
              >
                <Link href={treezLogoutPath("/")}>退出</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href={treezLoginPath("/")}>登录</Link>
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="打开导航"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="heritage-sheet">
              <SheetHeader>
                <SheetTitle>
                  <TreezLogo />
                </SheetTitle>
              </SheetHeader>
              <nav className="mobile-nav" aria-label="移动端导航">
                <NavigationLinks close />
                <SheetClose asChild>
                  <Link href="/search">搜索</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/add">新增公共条目</Link>
                </SheetClose>
                {viewer && (
                  <>
                    <SheetClose asChild>
                      <Link href="/me">我的公开档案</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href={treezLogoutPath("/")}>退出登录</Link>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
