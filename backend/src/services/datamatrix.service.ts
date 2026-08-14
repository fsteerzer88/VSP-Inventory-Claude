import bwipjs from "bwip-js/node";
import { env } from "../config/env";

export function productUrl(productId: string): string {
  return `${env.publicBaseUrl}/products/${productId}`;
}

export function generateProductDataMatrixSvg(productId: string): string {
  return bwipjs.toSVG({
    bcid: "datamatrix",
    text: productUrl(productId),
    scale: 3,
  });
}
