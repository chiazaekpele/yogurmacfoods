import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/PageHead";
import { ProductForm } from "@/components/admin/ProductForm";
import { listCategoryOptions } from "@/lib/admin/categories";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const [p, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: [{ price: "asc" }, { flavour: "asc" }] } } }),
    listCategoryOptions(),
  ]);
  if (!p) notFound();
  return (
    <div>
      <PageHead eyebrow="Products" title={`Edit ${p.name}`} />
      <ProductForm
        productId={p.id}
        categories={categories}
        initial={{
          name: p.name,
          categoryId: p.categoryId,
          description: p.description,
          images: p.images,
          isFeatured: p.isFeatured,
          isActive: p.isActive,
          variants: p.variants.map((x) => ({
            id: x.id,
            flavour: x.flavour,
            size: x.size,
            price: x.price.toString(),
            isAvailable: x.isAvailable,
            imageUrl: x.imageUrl,
            contents: x.contents ?? "",
          })),
        }}
      />
    </div>
  );
}
