import { ProfileView } from "@/components/treez/profile-view";
import { requireTreezPage } from "@/lib/auth/viewer";
import { getProfileById } from "@/lib/treez/api";
import { emptyPublicProfile } from "@/lib/treez/profile";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const viewer = await requireTreezPage("/me");
  const profile = await getProfileById(viewer.session.id).catch(() =>
    emptyPublicProfile(viewer.session),
  );
  return <ProfileView data={profile} personal />;
}
