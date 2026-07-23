import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./client";
import type { Product } from "@/types/models";

export function useProducts(q?: string) {
  return useQuery<Product[]>({
    queryKey: ["products", q ?? ""],
    queryFn: () => api.get<Product[]>(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery<Product>({
    queryKey: ["products", "detail", id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useProductByBarcode(barcode: string | undefined) {
  return useQuery<Product | null>({
    queryKey: ["products", "barcode", barcode],
    queryFn: async () => {
      try {
        return await api.get<Product>(`/products/lookup?barcode=${encodeURIComponent(barcode ?? "")}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!barcode,
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const form = new FormData();
      form.append("image", file);
      return api.postForm(`/products/${productId}/images`, form);
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["products", "detail", variables.productId] }),
  });
}

export function productImageUrl(productId: string, imageId: string): string {
  return `/api/products/${productId}/images/${imageId}`;
}
