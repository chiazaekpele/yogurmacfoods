import Image from "next/image";

// Shows the product photo, or a branded placeholder block when there is none yet
// (PRD §13: layout must not break when images are missing).
export function ProductImage({
  src,
  alt,
  label,
  tone = "ph-generic",
  eager,
  sizes = "(max-width: 560px) 100vw, 33vw",
  position = "center",
}: {
  src: string | null | undefined;
  alt: string;
  label?: string;
  tone?: string;
  // Above the fold (possibly the LCP image): load immediately, at high priority.
  // Replaces the `priority` prop, deprecated in Next.js 16.
  eager?: boolean;
  sizes?: string;
  position?: string;
}) {
  if (!src) {
    return (
      <div className={`img-ph img-fill ${tone}`} role="img" aria-label={alt}>
        {label ?? alt}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={{ objectFit: "cover", objectPosition: position }}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
    />
  );
}
