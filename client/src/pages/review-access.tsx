import { Link } from "wouter";
import { PageTracker } from "@/hooks/use-page-tracking";
import { PublicLayout } from "@/components/layout/public-layout";
export default function ReviewAccessPage() {
  return (
    <PublicLayout>
      <PageTracker title="Your trade space | Pharma Oasis review" />
      <div className="wrap">
        <section className="page-intro">
          <span className="eyebrow">WEBSITE REVIEW</span>
          <h1>Your trade space.</h1>
          <p>
            This preview uses the public catalogue. Account login, applications,
            orders and enquiries are disabled here while we review the website.
          </p>
          <div className="actions mt-8">
            <Link className="btn citron" href="/products">
              Explore the catalogue
            </Link>
            <a
              className="text-link"
              href="https://pharmaoasis.co.uk/portal"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the live customer portal ↗
            </a>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
