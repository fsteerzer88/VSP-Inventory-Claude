import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Location } from "@/types/models";

export function useLocations(q?: string) {
  return useQuery<Location[]>({
    queryKey: ["locations", q ?? ""],
    queryFn: () => api.get<Location[]>(`/locations${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useLocation(id: string | undefined) {
  return useQuery<Location>({
    queryKey: ["locations", "detail", id],
    queryFn: () => api.get<Location>(`/locations/${id}`),
    enabled: !!id,
  });
}

export function useLocationByCode(code: string | undefined) {
  return useQuery<Location>({
    queryKey: ["locations", "code", code],
    queryFn: () => api.get<Location>(`/locations/lookup?code=${encodeURIComponent(code ?? "")}`),
    enabled: !!code,
    retry: false,
  });
}

interface CreateLocationInput {
  name: string;
  code: string;
  description?: string;
  parentLocationId?: string | null;
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLocationInput) => api.post<Location>("/locations", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateLocationInput>) =>
      api.patch<Location>(`/locations/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/locations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function locationQrCodeUrl(id: string): string {
  return `/api/locations/${id}/qrcode.svg`;
}
