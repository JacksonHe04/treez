import { redirect } from "next/navigation";

import { ProfileView } from "@/components/treez/profile-view";
import { requireTreezPage } from "@/lib/auth/viewer";
import { getProfileById } from "@/lib/treez/api";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const viewer = await requireTreezPage("/me");
  const profile = await getProfileById(viewer.session.id).catch(() => null);
  if (!profile) redirect("/add");
  return <ProfileView data={profile} personal />;
}
