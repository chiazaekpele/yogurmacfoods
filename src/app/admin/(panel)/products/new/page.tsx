import type { Metadata } from "next";
import { PageHead } from "@/components/admin/PageHead";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <div>
      <PageHead eyebrow="Products" title="Add product" />
      <ProductForm
        productId={null}
        initial={{
          name: "",
          slug: "",
          category: "YOGURT",
          description: "",
          images: [],
          isFeatured: false,
          isActive: true,
          variants: [{ flavour: "", size: "", price: "", isAvailable: true, imageUrl: null }],
        }}
      />
    </div>
  );
}
