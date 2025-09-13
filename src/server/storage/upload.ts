import { supabaseAdmin } from "~/lib/supabase";

export async function uploadPublicFile(bucket: string, path: string, data: Buffer | ArrayBuffer) {
  const sb = supabaseAdmin();
  const { error } = await sb.storage.from(bucket).upload(path, data, { upsert: true });
  if (error) throw error;
  const { data: pubUrl } = sb.storage.from(bucket).getPublicUrl(path);
  return pubUrl.publicUrl;
}

export async function deleteFile(bucket: string, path: string) {
  const sb = supabaseAdmin();
  const { error } = await sb.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
}

export async function getSignedUploadUrl(bucket: string, path: string, expiresIn = 3600) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path, {
    upsert: true,
  });
  if (error) throw error;
  return data;
}