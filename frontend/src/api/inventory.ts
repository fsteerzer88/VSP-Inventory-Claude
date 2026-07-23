import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { InventoryItem } from "@/types/models";

export function useInventory(params?: { locationId?: string; productId?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params?.locationId) search.set("locationId", params.locationId);
  if (params?.productId) search.set("productId", params.productId);
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();

  return useQuery<InventoryItem[]>({
    queryKey: ["inventory", params ?? {}],
    queryFn: () => api.get<InventoryItem[]>(`/inventory${qs ? `?${qs}` : ""}`),
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery<InventoryItem>({
    queryKey: ["inventory", "detail", id],
    queryFn: () => api.get<InventoryItem>(`/inventory/${id}`),
    enabled: !!id,
  });
}

interface IntakeInput {
  productId?: string;
  newProduct?: {
    barcode?: string;
    barcodeType?: string;
    name: string;
    description?: string;
    manufacturer?: string;
    category?: string;
    sku?: string;
  };
  locationId: string;
  quantity: number;
  notes?: string;
}

export function useIntake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IntakeInput) => api.post("/inventory/intake", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

interface CheckoutInput {
  inventoryItemId?: string;
  productId?: string;
  locationId?: string;
  quantity: number;
  notes?: string;
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => api.post("/inventory/checkout", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
