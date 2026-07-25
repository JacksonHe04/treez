import { InonSsoError, type InonProjectSession } from '@inon-ai/inon-sso';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getTreezSso } from '@/lib/auth/inon-sso';

export type TreezViewer = {
  session: InonProjectSession;
  isAdmin: boolean;
};

function origin(): string {
  return (
    process.env.INON_SSO_PUBLIC_ORIGIN ??
    (process.env.NODE_ENV === 'production'
      ? 'https://treez.inon.space'
      : 'http://localhost:3000')
  );
}

export async function currentRequest(): Promise<Request> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');
  return new Request(origin(), cookie ? { headers: { cookie } } : undefined);
}

function viewer(session: InonProjectSession): TreezViewer {
  return {
    session,
    isAdmin: session.projectRole === 'admin',
  };
}

export async function viewerFromRequest(
  request: Request,
): Promise<TreezViewer | null> {
  const session = await getTreezSso().getSession(request);
  return session ? viewer(session) : null;
}

export async function getTreezViewer(): Promise<TreezViewer | null> {
  return viewerFromRequest(await currentRequest());
}

export async function requireTreezUserRequest(
  request: Request,
): Promise<TreezViewer> {
  return viewer(await getTreezSso().requireUser(request));
}

export async function requireTreezAdminRequest(
  request: Request,
): Promise<TreezViewer> {
  return viewer(await getTreezSso().requireProjectAdmin(request));
}

export async function requireTreezPage(
  returnTo: string,
  options?: { admin?: boolean },
): Promise<TreezViewer> {
  const request = await currentRequest();

  try {
    return options?.admin
      ? await requireTreezAdminRequest(request)
      : await requireTreezUserRequest(request);
  } catch (error) {
    if (error instanceof InonSsoError) {
      if (error.code === 'UNAUTHENTICATED') {
        redirect(getTreezSso().loginUrl(returnTo));
      }
      if (error.code === 'REFRESH_REQUIRED') {
        redirect(getTreezSso().refreshUrl(returnTo));
      }
      if (error.code === 'FORBIDDEN') redirect('/');
    }
    throw error;
  }
}
