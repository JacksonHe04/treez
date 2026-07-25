import { handleTreezPublicSsoRoute } from '@/lib/auth/public-route';

export function GET(request: Request): Promise<Response> {
  return handleTreezPublicSsoRoute(request, 'refresh');
}
