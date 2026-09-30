import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import { BrandInterestButton } from "@/components/skincare-interest";
export default function OasisbiomePage() {
  return (
    <PublicLayout>
      <PageTracker title="Introducing Oasisbiome | Pharma Oasis" />
      <div className="wrap">
        <section className="standalone-biome">
          <div className="biome-copy">
            <span className="eyebrow">THE NEXT CHAPTER · COMING SOON</span>
            <h1>OasisBiome</h1>
            <div className="byline">BY PHARMA OASIS</div>
            <p>
              Our own brand. A new expression of the care and consideration
              behind Pharma Oasis.
            </p>
            <p>
              We’re preparing for launch and welcoming conversations with future
              stockists.
            </p>
            <BrandInterestButton brand="OasisBiome" className="btn" />
            <p className="soft-note">
              Packaging concept shown. Final packaging, range and launch details
              are to be confirmed.
            </p>
          </div>
          <img
            src="/brand/oasisbiome.webp"
            alt="OasisBiome DAILY packaging concept"
            width="1536"
            height="1024"
          />
        </section>
        <section className="story-short">
          <div>
            <span className="eyebrow">FOR OUR TRADE PARTNERS</span>
            <h2>
              Be part of
              <br />
              the beginning.
            </h2>
          </div>
          <div>
            <p>
              Speak with us about the launch range, trade information and
              stockist opportunities. Our team will share confirmed details as
              they become available.
            </p>
            <BrandInterestButton brand="OasisBiome" className="text-link" label="Tell us about your interest" />
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
