import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth">
      <div className="auth-card card">
        <div className="eyebrow">404</div>
        <h1 className="h1">Page not found</h1>
        <p className="muted" style={{ marginBottom: 16 }}>That page doesn’t exist, or it is no longer available to you.</p>
        <Link className="btn" href="/">
          Back to my dashboard
        </Link>
      </div>
    </div>
  );
}
