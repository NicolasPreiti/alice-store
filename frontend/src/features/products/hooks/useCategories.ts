import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/api/products";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: listCategories });
}
