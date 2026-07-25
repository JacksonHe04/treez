import { requireTreezPage } from '@/lib/auth/viewer';
import BasicLayout from '@/components/layout/BasicLayout';

export const dynamic = 'force-dynamic';

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTreezPage('/user/me');
  return <BasicLayout>{children}</BasicLayout>;
}
