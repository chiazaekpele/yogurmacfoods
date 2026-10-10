import { formatNaira } from "@/lib/money";

type DecimalLike = { toString(): string } | string | number;

// Large prices in the heavy display face: the ₦ sign is set in the body face,
// lighter and smaller, so its bars don't read as a struck-out price.
export function Naira({ value }: { value: DecimalLike }) {
  const text = formatNaira(value);
  return (
    <>
      <span className="naira" aria-hidden>
        ₦
      </span>
      <span className="sr-only">₦</span>
      {text.replace(/^₦/, "")}
    </>
  );
}
