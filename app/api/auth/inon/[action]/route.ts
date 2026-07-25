import { getTreezSso } from '@/lib/auth/inon-sso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return getTreezSso().handler(request);
}
