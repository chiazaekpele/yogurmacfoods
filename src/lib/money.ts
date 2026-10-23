// All naira <-> kobo conversion goes through these helpers (TRD §5.3).
// Amounts are handled as integer kobo; never do arithmetic on float naira.

type DecimalLike = { toString(): string } | string | number;

export function toKobo(naira: DecimalLike): number {
  const s = typeof naira === "number" ? naira.toFixed(2) : naira.toString();
  const match = /^(-?)(\d+)(?:\.(\d{1,2})\d*)?$/.exec(s.trim());
  if (!match) throw new Error(`Invalid naira amount: ${s}`);
  const [, sign, whole, frac = ""] = match;
  const kobo = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return sign ? -kobo : kobo;
}

export function fromKobo(kobo: number): string {
  if (!Number.isInteger(kobo)) throw new Error(`Kobo must be an integer: ${kobo}`);
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(kobo);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatNaira(naira: DecimalLike): string {
  const kobo = toKobo(naira);
  const hasKobo = kobo % 100 !== 0;
  return (
    "₦" +
    (kobo / 100).toLocaleString("en-NG", {
      minimumFractionDigits: hasKobo ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

// VAT in kobo on an amount in kobo, at a percentage rate, rounded to the
// nearest kobo. Checkout (server) and the checkout form (browser) both use it.
export const vatKobo = (amountKobo: number, ratePercent: number) => Math.round((amountKobo * ratePercent) / 100);
