import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/PageHead";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id }, include: { variants: { orderBy: [{ flavour: "asc" }, { price: "asc" }] } } });
  if (!p) notFound();
  return (
    <div>
      <PageHead eyebrow="Products" title={`Edit ${p.name}`} />
      <ProductForm
        productId={p.id}
        initial={{
          name: p.name,
          slug: p.slug,
          category: p.category,
          description: p.description,
          images: p.images,
          isFeatured: p.isFeatured,
          isActive: p.isActive,
          variants: p.variants.map((x) => ({ id: x.id, flavour: x.flavour, size: x.size, price: x.price.toString(), isAvailable: x.isAvailable, imageUrl: x.imageUrl })),
        }}
      />
    </div>
  );
}
