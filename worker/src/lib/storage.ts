import { createClient } from "@supabase/supabase-js";

import type { Env } from "../types";

export function isAssetStorageConfigured(env: Env): boolean {
  return Boolean(
    env.SUPABASE_URL && env.SUPABASE_SECRET_KEY && env.SUPABASE_STORAGE_BUCKET,
  );
}

export function publicAssetUrl(env: Env, objectKey: string): string {
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
  const bucket = encodeURIComponent(env.SUPABASE_STORAGE_BUCKET);
  const key = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseUrl}/storage/v1/object/public/${bucket}/${key}`;
}

export async function uploadAsset(
  env: Env,
  objectKey: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(objectKey, new Uint8Array(body), {
      cacheControl: "31536000",
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase asset upload failed: ${error.message}`);
  }
}
