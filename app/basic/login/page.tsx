import { redirect } from 'next/navigation';

import { treezLoginPath } from '@/lib/auth/paths';

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  redirect(treezLoginPath(safeReturnTo((await searchParams).redirect)));
}
