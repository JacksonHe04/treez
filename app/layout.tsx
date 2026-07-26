import type { Metadata } from "next";
import { Caveat, Cormorant_Garamond, Geist } from "next/font/google";

import { SiteHeader } from "@/components/treez/site-header";
import { Toaster } from "@/components/ui/sonner";
import { getOptionalTreezViewer } from "@/lib/auth/viewer";
import { cn } from "@/lib/utils";

import "./globals.css";
import { Providers } from "./providers";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});
const editorial = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial",
});
const handwritten = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://treez.inon.space"),
  title: {
    default: "Treez — 个人鉴赏志",
    template: "%s — Treez",
  },
  description: "记录音乐、影视、书籍与游戏，在公开档案中看见自己的审美轨迹。",
  openGraph: {
    title: "Treez — 个人鉴赏志",
    description: "听过、看过、读过、玩过，然后留下自己的判断。",
    type: "website",
    locale: "zh_CN",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await getOptionalTreezViewer();
  return (
    <html
      lang="zh-CN"
      data-scroll-behavior="smooth"
      className={cn(sans.variable, editorial.variable, handwritten.variable)}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <SiteHeader
            viewer={
              viewer
                ? {
                    id: viewer.session.id,
                    username: viewer.session.username,
                  }
                : null
            }
          />
          {children}
          <footer className="site-footer">
            <div className="page-shell">
              <p>Treez / 一份持续生长的个人鉴赏志</p>
              <p>Music · Film · Books · Games</p>
            </div>
          </footer>
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
