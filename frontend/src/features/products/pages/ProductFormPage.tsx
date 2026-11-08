import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { useMe } from "@/features/auth/hooks/useMe";
import { useCategories } from "../hooks/useCategories";
import { useCreateProduct, useProduct, useUpdateProduct } from "../hooks/useProducts";
import { productFormSchema } from "../schemas/product.schema";
import { z } from "zod";

type ProductFormInput = z.input<typeof productFormSchema>;

export function ProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useMe();
  const categories = useCategories();
  const product = useProduct(mode === "edit" ? id : undefined);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id);

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      cost: "",
      price: "",
      stock: 0,
      categoryId: "",
      description: "",
    },
  });

  useEffect(() => {
    if (mode === "edit" && product.data) {
      form.reset({
        name: product.data.name,
        sku: product.data.sku,
        cost: product.data.cost,
        price: product.data.price,
        stock: product.data.stock,
        categoryId: product.data.categoryId,
        description: product.data.description ?? "",
      });
    }
  }, [mode, product.data, form]);

  async function onSubmit(values: ProductFormInput) {
    // RHF types handleSubmit with the form's *input* shape; explicitly parse
    // to the zod output (numbers) so the API always receives numbers.
    const parsed = productFormSchema.parse(values);
    const payload = {
      ...parsed,
      description: parsed.description?.trim() ? parsed.description : null,
    };
    try {
      if (mode === "create") await createMutation.mutateAsync(payload);
      else await updateMutation.mutateAsync(payload);
      navigate("/products", { replace: true });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message: unknown }).message
          : null;
      const text = Array.isArray(message)
        ? message.join(". ")
        : typeof message === "string"
          ? message
          : "Could not save the product.";
      // Duplicate sku is the common 409; unknown categoryId is a 404.
      const status = error && typeof error === "object" && "status" in error ? (error as { status: unknown }).status : undefined;
      if (status === 409) form.setError("sku", { type: "server", message: text });
      else if (status === 404) form.setError("categoryId", { type: "server", message: text });
      else form.setError("root", { type: "server", message: text });
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const categoriesLoading = categories.isLoading;
  const noCategories = !categoriesLoading && (categories.data?.length ?? 0) === 0;

  return (
    <AppShell
      title={mode === "create" ? "New product" : "Edit product"}
      breadcrumb={["Overview", "Products", mode === "create" ? "New" : "Edit"]}
      role={user?.role}
      userName={user?.name}
    >
      <div className="max-w-xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          {mode === "create" ? "New product" : "Edit product"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "create"
            ? "Add a product to the catalog."
            : "Update this product's details."}
        </p>

        {noCategories ? (
          <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm">
            Create a category first — products need one.{" "}
            <Link to="/categories" className="text-primary underline underline-offset-4">
              Go to categories
            </Link>
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <select
                        aria-label="Category"
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="" disabled>
                          {categoriesLoading ? "Loading categories…" : "Select a category"}
                        </option>
                        {(categories.data ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root ? (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || categoriesLoading}>
                  {isSubmitting ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/products">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </AppShell>
  );
}
