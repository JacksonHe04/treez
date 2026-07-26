import { ProfileView } from "@/components/treez/profile-view";
import { requireTreezPage } from "@/lib/auth/viewer";
import { getProfileById, isTreezApiNotFound } from "@/lib/treez/api";
import { emptyPublicProfile } from "@/lib/treez/profile";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const viewer = await requireTreezPage("/me");
  const profile = await getProfileById(viewer.session.id).catch(
    (error: unknown) => {
      if (isTreezApiNotFound(error)) {
        return emptyPublicProfile(viewer.session);
      }
      throw error;
    },
  );
  return <ProfileView data={profile} personal />;
}
