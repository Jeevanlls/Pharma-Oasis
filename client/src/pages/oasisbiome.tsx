import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import { useTradeSettings } from "@/lib/trade-site";
export default function OasisbiomePage() {
  const { data: settings } = useTradeSettings();
  const enquiry = `mailto:${settings?.contact_email || "trade@pharmaoasis.com"}?subject=${encodeURIComponent("Oasisbiome — early stockist interest")}`;
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
            <a className="btn" href={enquiry}>
              Become an early stockist
            </a>
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
            <a className="text-link" href={enquiry}>
              Talk to us about Oasisbiome
            </a>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
