import Link from "next/link";

// Text wordmark in the packaging's green until Yogurmac supplies the logo file
// (an SVG drops in here).
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Yogurmac Foods, home">
      <span>Yogurmac</span>
    </Link>
  );
}
