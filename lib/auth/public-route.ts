import { getTreezSso } from './inon-sso';

export function handleTreezPublicSsoRoute(
  request: Request,
  action: 'login' | 'logout',
): Promise<Response> {
  const sso = getTreezSso();
  const url = new URL(request.url);
  url.pathname = `${sso.basePath}/${action}`;
  return sso.handler(new Request(url, request));
}
