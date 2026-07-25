import { createMiddleware } from "hono/factory";
import { z } from "zod";

import type { AppBindings, TreezUser } from "../types";

const signedUserSchema = z.object({
  id: z.string().min(1).max(128),
  username: z.string().min(1).max(64).nullable(),
});

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeUser(value: string): TreezUser {
  const bytes = decodeBase64Url(value);
  const json = new TextDecoder().decode(bytes);
  return signedUserSchema.parse(JSON.parse(json));
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const requireSignedUser = createMiddleware<AppBindings>(
  async (context, next) => {
    const timestamp = context.req.header("x-treez-timestamp");
    const encodedUser = context.req.header("x-treez-user");
    const encodedSignature = context.req.header("x-treez-signature");

    if (!timestamp || !encodedUser || !encodedSignature) {
      return context.json(
        {
          error: {
            code: "UNAUTHENTICATED",
            message: "A signed Treez user request is required.",
          },
        },
        401,
      );
    }

    const timestampSeconds = Number(timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      !Number.isInteger(timestampSeconds) ||
      Math.abs(nowSeconds - timestampSeconds) > 300
    ) {
      return context.json(
        {
          error: {
            code: "SIGNATURE_EXPIRED",
            message: "The signed request has expired.",
          },
        },
        401,
      );
    }

    try {
      const body = await context.req.raw.clone().arrayBuffer();
      const bodyHash = await sha256Hex(body);
      const path = new URL(context.req.url).pathname;
      const message = [
        timestamp,
        context.req.method.toUpperCase(),
        path,
        bodyHash,
        encodedUser,
      ].join("\n");
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(context.env.WRITE_SIGNING_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const valid = await crypto.subtle.verify(
        "HMAC",
        key,
        decodeBase64Url(encodedSignature),
        new TextEncoder().encode(message),
      );

      if (!valid) {
        return context.json(
          {
            error: {
              code: "INVALID_SIGNATURE",
              message: "The request signature is invalid.",
            },
          },
          401,
        );
      }

      context.set("user", decodeUser(encodedUser));
      await next();
    } catch {
      return context.json(
        {
          error: {
            code: "INVALID_SIGNATURE",
            message: "The signed request could not be verified.",
          },
        },
        401,
      );
    }
  },
);
