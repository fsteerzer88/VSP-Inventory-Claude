import multer from "multer";
import path from "path";
import crypto from "crypto";
import { productImageDir } from "../services/image-storage.service";

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const productId = req.params.id as string;
    cb(null, productImageDir(productId));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Unsupported image type"));
      return;
    }
    cb(null, true);
  },
});
