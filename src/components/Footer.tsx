import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="ft-row">
        <a className="ft-cell" href="#top">
          ↑ Back to top
        </a>
        <Link className="ft-cell" href="/our-story">
          Our story
        </Link>
      </div>
      <div className="ft-row">
        <Link className="ft-cell" href="/ythirst">
          Ythirst project
        </Link>
        <Link className="ft-cell" href="/partner">
          Give to Ythirst
        </Link>
      </div>
      <div className="ft-row4">
        <a className="ft-cell4" href={`mailto:${CONTACT_EMAIL}`}>
          Contact
        </a>
        <Link className="ft-cell4" href="/privacy-policy">
          Privacy policy
        </Link>
        <Link className="ft-cell4" href="/privacy-policy#cookies">
          Cookie consent
        </Link>
      </div>
      <div className="ft-copy">© {new Date().getFullYear()} Yogurmac Foods Limited · Faith-driven · Lagos-made</div>
    </footer>
  );
}
