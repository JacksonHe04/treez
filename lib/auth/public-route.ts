import { getTreezSso } from "./inon-sso";

export function handleTreezPublicSsoRoute(
  request: Request,
  action: "login" | "logout" | "refresh",
): Response {
  const sso = getTreezSso();
  return sso.transition(request, action);
}
