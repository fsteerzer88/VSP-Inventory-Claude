import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./client";
import type { Product, ProductSource } from "@/types/models";

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

interface UpdateProductInput {
  barcode?: string | null;
  barcodeType?: string | null;
  name?: string;
  description?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  sku?: string | null;
  partNumber?: string | null;
  reorderThreshold?: number | null;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateProductInput) =>
      api.patch<Product>(`/products/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAddProductSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, label, url, notes }: { productId: string; label: string; url: string; notes?: string }) =>
      api.post<ProductSource>(`/products/${productId}/sources`, { label, url, notes }),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["products", "detail", variables.productId] }),
  });
}

export function useDeleteProductSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, sourceId }: { productId: string; sourceId: string }) =>
      api.delete<void>(`/products/${productId}/sources/${sourceId}`),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["products", "detail", variables.productId] }),
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
