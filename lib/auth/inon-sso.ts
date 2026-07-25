import { createInonSso } from "@inon-ai/inon-sso";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for iNon SSO.`);
  return value;
}

function appOrigin(): string {
  return (
    process.env.INON_SSO_PUBLIC_ORIGIN ??
    (process.env.NODE_ENV === "production"
      ? "https://treez.inon.space"
      : "http://localhost:3000")
  );
}

let client: ReturnType<typeof createInonSso> | undefined;

export function getTreezSso() {
  const origin = appOrigin();
  client ??= createInonSso({
    project: "treez",
    clientId: required("INON_SSO_CLIENT_ID"),
    clientSecret: required("INON_SSO_CLIENT_SECRET"),
    sessionSecret: required("INON_SSO_SESSION_SECRET"),
    appOrigin: origin,
    secureCookies: origin.startsWith("https://"),
  });
  return client;
}
