import { redirect } from 'next/navigation';

import { getTreezSso } from '@/lib/auth/inon-sso';

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  redirect(getTreezSso().loginUrl(safeReturnTo((await searchParams).redirect)));
}
