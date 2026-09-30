import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
export default function AboutPage() {
  return (
    <PublicLayout>
      <PageTracker title="Our world | Pharma Oasis" />
      <div className="wrap">
        <section className="page-intro">
          <span className="eyebrow">PHARMA OASIS</span>
          <h1>
            Wholesale.
            <br />
            With people at its heart.
          </h1>
        </section>
        <section className="story-big">
          <div>
            <h2>
              Your range.
              <br />
              Your market.
              <br />A shared ambition.
            </h2>
            <div className="credential-block">
              <span className="eyebrow">OUR FOUNDATION</span>
              <h3>
                UK pharmaceutical
                <br />
                wholesale expertise.
              </h3>
              <p>
                Pharma Oasis Limited
                <br />
                WDA(H) 53820
                <br />
                Nantwich, United Kingdom
              </p>
              <Link className="text-link mt-5" href="/compliance">
                Our credentials
              </Link>
            </div>
          </div>
          <div>
            <p>
              Pharma Oasis connects trade customers with healthcare, wellness
              and beauty products. Our focus is on vitamins and supplements,
              cosmetics and OTC products, supported by our pharmaceutical
              wholesale experience.
            </p>
            <p>
              We work with customers who value a personal relationship: a
              conversation about the right range, a tailored quotation and
              someone to contact when plans change.
            </p>
            <p>
              With Oasisbiome, we are also beginning a new chapter as a brand
              owner.
            </p>
            <div className="actions">
              <Link className="btn" href="/contact">
                Let’s talk
              </Link>
              <Link className="text-link" href="/supplier-registration">
                Partner with us
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
