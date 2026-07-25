import { redirect } from 'next/navigation';

import { getTreezSso } from '@/lib/auth/inon-sso';

export default function Signup() {
  redirect(getTreezSso().loginUrl('/'));
}
