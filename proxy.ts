import { NextResponse, type NextRequest } from 'next/server';

import { getTreezSso } from '@/lib/auth/inon-sso';

export async function proxy(request: NextRequest) {
  const session = await getTreezSso().getSession(request);
  if (!session) {
    return NextResponse.redirect(
      new URL(
        getTreezSso().loginUrl(
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
        ),
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/user/:path*'],
};
