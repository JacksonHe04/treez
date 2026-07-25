import { redirect } from 'next/navigation';

import { treezLoginPath } from '@/lib/auth/paths';

export default function Signup() {
  redirect(treezLoginPath('/'));
}
