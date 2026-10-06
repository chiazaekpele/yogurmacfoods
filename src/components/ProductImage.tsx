import Image from "next/image";

// Shows the product photo, or a branded placeholder block when there is none yet
// (PRD §13: layout must not break when images are missing).
export function ProductImage({
  src,
  alt,
  label,
  tone = "ph-generic",
  priority,
  sizes = "(max-width: 560px) 100vw, 33vw",
}: {
  src: string | null | undefined;
  alt: string;
  label?: string;
  tone?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!src) {
    return (
      <div className={`img-ph img-fill ${tone}`} role="img" aria-label={alt}>
        {label ?? alt}
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} style={{ objectFit: "cover" }} priority={priority} />;
}
