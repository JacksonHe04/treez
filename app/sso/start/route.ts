import { handleTreezPublicSsoRoute } from "@/lib/auth/public-route";

export function GET(request: Request): Response {
  return handleTreezPublicSsoRoute(request, "login");
}
