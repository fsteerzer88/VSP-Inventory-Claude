import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Transaction } from "@/types/models";

export function useTransactions(params?: { productId?: string; locationId?: string; userId?: string }) {
  const search = new URLSearchParams();
  if (params?.productId) search.set("productId", params.productId);
  if (params?.locationId) search.set("locationId", params.locationId);
  if (params?.userId) search.set("userId", params.userId);
  const qs = search.toString();

  return useQuery<Transaction[]>({
    queryKey: ["transactions", params ?? {}],
    queryFn: () => api.get<Transaction[]>(`/transactions${qs ? `?${qs}` : ""}`),
  });
}
