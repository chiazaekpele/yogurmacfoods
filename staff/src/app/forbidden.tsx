import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="auth">
      <div className="auth-card card">
        <div className="eyebrow">403</div>
        <h1 className="h1">Not for your account</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          This page is only available to the business owner. If you think this is a mistake, speak to your manager.
        </p>
        <Link className="btn" href="/">
          Go to my dashboard
        </Link>
      </div>
    </div>
  );
}
