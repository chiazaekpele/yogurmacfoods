import Link from "next/link";

export default function NotFound() {
  return (
    <div className="confirm">
      <h1 className="page-h1">Page not found</h1>
      <p className="prose" style={{ margin: "12px 0 20px" }}>
        We couldn’t find that page. If you were looking for an order, check the Order ID in your confirmation email.
      </p>
      <Link className="btn" href="/products">
        Browse products
      </Link>
    </div>
  );
}
