import { createHash, createHmac } from "node:crypto";

import type { InonProjectSession } from "@inon-ai/inon-sso";

import { TREEZ_API_URL } from "./api";

function bodyHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function signingSecret(): string {
  const value = process.env.TREEZ_API_SECRET;
  if (!value) throw new Error("TREEZ_API_SECRET is required.");
  return value;
}

export async function signedTreezRequest(
  pathname: string,
  input: {
    method: "POST" | "PUT";
    body: string;
    session: InonProjectSession;
    contentType?: string;
  },
): Promise<Response> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const encodedUser = Buffer.from(
    JSON.stringify({
      id: input.session.id,
      username: input.session.username,
    }),
  ).toString("base64url");
  const message = [
    timestamp,
    input.method,
    pathname,
    bodyHash(input.body),
    encodedUser,
  ].join("\n");
  const signature = createHmac("sha256", signingSecret())
    .update(message)
    .digest("base64url");

  return fetch(`${TREEZ_API_URL}${pathname}`, {
    method: input.method,
    body: input.body,
    headers: {
      Accept: "application/json",
      "Content-Type": input.contentType ?? "application/json",
      "x-treez-timestamp": timestamp,
      "x-treez-user": encodedUser,
      "x-treez-signature": signature,
    },
    cache: "no-store",
  });
}
