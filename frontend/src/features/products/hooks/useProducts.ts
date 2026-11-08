import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct, getProduct, listProducts, updateProduct, type ProductValues } from "@/api/products";

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: listProducts });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProductValues) => createProduct(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProductValues) => updateProduct(id as string, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}
