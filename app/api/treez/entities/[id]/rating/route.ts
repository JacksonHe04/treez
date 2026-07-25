import { InonSsoError } from "@inon-ai/inon-sso";

import { requireTreezUserRequest } from "@/lib/auth/viewer";
import { signedTreezRequest } from "@/lib/treez/signed-request";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const viewer = await requireTreezUserRequest(request);
    const { id } = await context.params;
    const pathname = `/v1/entities/${encodeURIComponent(id)}/rating`;
    const body = await request.text();
    const upstream = await signedTreezRequest(pathname, {
      method: "PUT",
      body,
      session: viewer.session,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof InonSsoError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: "登录后才能留下评分。",
          },
        },
        { status: error.code === "FORBIDDEN" ? 403 : 401 },
      );
    }
    throw error;
  }
}
