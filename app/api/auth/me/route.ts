import { getTreezViewer } from '@/lib/auth/viewer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const viewer = await getTreezViewer();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!viewer) return Response.json({ user: null }, { headers });

  return Response.json(
    {
      user: {
        id: viewer.session.id,
        email: viewer.session.email,
        username: viewer.session.username,
        isAdmin: viewer.isAdmin,
      },
    },
    { headers },
  );
}
