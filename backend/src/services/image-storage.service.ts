import fs from "fs";
import path from "path";
import { env } from "../config/env";

export function ensureImagesDir() {
  fs.mkdirSync(env.imagesDir, { recursive: true });
}

export function productImageDir(productId: string): string {
  const dir = path.join(env.imagesDir, "products", productId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveImagePath(relativePath: string): string {
  const resolved = path.resolve(env.imagesDir, relativePath);
  if (!resolved.startsWith(path.resolve(env.imagesDir))) {
    throw new Error("Invalid image path");
  }
  return resolved;
}

export function deleteImageFile(relativePath: string) {
  const resolved = resolveImagePath(relativePath);
  fs.rm(resolved, { force: true }, () => {});
}
