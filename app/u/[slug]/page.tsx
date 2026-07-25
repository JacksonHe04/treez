import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileView } from "@/components/treez/profile-view";
import { getProfile } from "@/lib/treez/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProfile(slug).catch(() => null);
  return data
    ? {
        title: `${data.profile.display_name} 的鉴赏档案`,
        description: `${data.ratings.length} 条音乐、影视、书与游戏鉴赏记录。`,
      }
    : { title: "档案未找到" };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getProfile(slug).catch(() => null);
  if (!profile) notFound();
  return <ProfileView data={profile} />;
}
