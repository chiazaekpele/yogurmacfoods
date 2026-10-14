import type { Metadata } from "next";
import { PageHead } from "@/components/admin/PageHead";
import { ProductForm } from "@/components/admin/ProductForm";
import { listCategoryOptions } from "@/lib/admin/categories";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listCategoryOptions();
  return (
    <div>
      <PageHead eyebrow="Products" title="Add product" />
      <ProductForm
        productId={null}
        categories={categories}
        initial={{
          name: "",
          categoryId: "",
          description: "",
          images: [],
          isFeatured: false,
          isActive: true,
          variants: [{ flavour: "", size: "", price: "", isAvailable: true, imageUrl: null, contents: "" }],
        }}
      />
    </div>
  );
}
