import type { Metadata } from "next";
import { PageHead } from "@/components/PageHead";
import { ProductForm } from "@/components/ProductForm";
import { cloudinaryConfig } from "@/lib/cloudinary";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireRole("ADMIN");
  return (
    <div>
      <PageHead eyebrow="Products" title="Add product" />
      <ProductForm
        productId={null}
        uploadsEnabled={!!cloudinaryConfig()}
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
