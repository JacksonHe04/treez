import { cors } from "hono/cors";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

import { publicRead } from "./routes/read";
import { signedWrite } from "./routes/write";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

app.use("*", secureHeaders());
app.use(
  "/v1/*",
  cors({
    origin: (origin, context) => {
      const configured = context.env.CORS_ORIGINS.split(",").map(
        (value: string) => value.trim(),
      );
      const isTreezPreview = /^https:\/\/treez-[a-z0-9-]+\.vercel\.app$/i.test(
        origin,
      );
      return configured.includes(origin) || isTreezPreview ? origin : "";
    },
    allowMethods: ["GET", "HEAD", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86_400,
  }),
);

app.route("/v1", publicRead);
app.route("/v1", signedWrite);

app.notFound((context) =>
  context.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "The requested Treez API route does not exist.",
      },
    },
    404,
  ),
);

app.onError((error, context) => {
  console.error(error);
  return context.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Treez could not complete this request.",
      },
    },
    500,
  );
});

export default app;
