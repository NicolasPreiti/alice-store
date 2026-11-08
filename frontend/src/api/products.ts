import { apiFetch } from "./client";

export interface Product {
  id: string;
  name: string;
  sku: string;
  cost: string;
  price: string;
  description: string | null;
  stock: number;
  categoryId: string;
  category: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductValues {
  name: string;
  sku: string;
  cost: number;
  price: number;
  description?: string | null;
  stock: number;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
}

export function listProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/products");
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export function createProduct(values: ProductValues): Promise<Product> {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateProduct(id: string, values: ProductValues): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories");
}
