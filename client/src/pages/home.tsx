import { WeeklyEditSection } from "@/components/weekly-edit";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Product } from "@shared/schema";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import {
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "@/components/seo/product-json-ld";
import {
  useCurrentOffers,
  useTradeSettings,
  whatsappHref,
} from "@/lib/trade-site";
import { SkincareInterest, BrandInterestButton } from "@/components/skincare-interest";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { isCustomer, isAdmin } = useAuth();
  const { data: settings } = useTradeSettings();
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(
      `/products?search=${encodeURIComponent(search.trim())}`,
    );
  };
  const reviewOnly = import.meta.env.VITE_REVIEW_PREVIEW === "true";
  const quickHref = "/portal/quote";
  return (
    <PublicLayout>
      <PageTracker title="Pharma Oasis — A new outlook on everyday wellbeing" />
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <section className="future-hero wrap">
        <div className="future-intro">
          <div className="hero-kicker">
            <span className="mini-orbit" aria-hidden="true" />
            <span>HEALTHCARE. WELLNESS. BEAUTY.</span>
          </div>
          <h1>
            A new outlook
            <br />
            on everyday
            <br />
            <em>wellbeing.</em>
          </h1>
          <div className="future-intro-bottom">
            <p>
              Connecting your business with the brands, products and
              possibilities that come next.
            </p>
            <div className="actions">
              <Link className="btn citron" href="/offers">
                Discover the weekly edit
              </Link>
              <Link className="text-link" href="/register">
                Partner with us
              </Link>
            </div>
          </div>
        </div>
        <figure className="future-hero-image">
          <img
            src="/brand/pharmaoasis-skincare.webp"
            alt="Pharma Oasis future skincare collection with branded cleanser, serum and face creams"
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <div className="tp-skin-caption"><span><strong>Pharma Oasis Skincare</strong>A future collection · Packaging concepts</span><a href="#future-skincare">Register your interest ↗</a></div>
        </figure>
        <div className="future-hero-foot">
          <span>UK wholesale expertise. Independent thinking.</span>
          <span>Vitamins · Beauty · OTC · Beyond</span>
        </div>
      </section>
      <section className="trade-dock wrap" aria-label="Quick trade actions">
        <div>
          <span className="eyebrow">A LITTLE LESS SEARCHING.</span>
          <h2>A little more possibility.</h2>
        </div>
        <form onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="trade-search">
            Search products, brands or EAN
          </label>
          <input
            id="trade-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a brand, product or EAN"
            maxLength={200}
          />
          <button aria-label="Search the product catalogue">
            <Search />
          </button>
        </form>
        <Link className="dock-quick" href={quickHref}>
          <span className="dock-symbol" aria-hidden="true">
            +
          </span>
          Build your quote
        </Link>
      </section>
      <WeeklyEditSection />
      <section className="future-focus wrap">
        <div className="focus-intro">
          <span className="eyebrow">WHAT WE BRING TO YOUR WORLD</span>
          <p>
            A considered range.
            <br />
            An open mind.
          </p>
        </div>
        <div className="future-focus-links">
          <Link href="/products?search=vitamin">
            <span>01</span>
            <h2>Vitamins & supplements</h2>
            <small>Explore</small>
          </Link>
          <Link href="/brands">
            <span>02</span>
            <h2>Beauty & cosmetics</h2>
            <small>Explore</small>
          </Link>
          <Link href="/contact">
            <span>03</span>
            <h2>OTC & healthcare</h2>
            <small>Enquire</small>
          </Link>
        </div>
      </section>
      <SkincareInterest />
      <section className="future-biome">
        <div className="wrap biome-title-row">
          <span className="eyebrow">
            FROM PHARMA OASIS
            <br />
            COMING SOON
          </span>
          <h2>
            OasisBiome<span>™</span>
          </h2>
        </div>
        <div className="wrap biome-window">
          <div className="biome-window-copy">
            <span className="eyebrow">OUR OWN EXPRESSION OF WELLBEING</span>
            <h3>
              A new beginning.
              <br />A considered
              <br />
              <em>daily ritual.</em>
            </h3>
            <p>
              Discover our upcoming brand and the opportunity to become an early
              stockist.
            </p>
            <Link className="btn" href="/oasisbiome">
              Meet Oasisbiome
            </Link>
            <BrandInterestButton brand="OasisBiome" className="text-link" />
            <span className="concept-caption">
              Packaging concept. Launch details to be confirmed.
            </span>
          </div>
          <img
            src="/brand/oasisbiome.webp"
            alt="OasisBiome DAILY packaging concept"
            loading="lazy"
            width="1536"
            height="1024"
          />
        </div>
      </section>
      <section className="future-close wrap">
        <div>
          <span className="eyebrow">WHOLESALE, WITH A HUMAN CONNECTION</span>
          <h2>
            Your ambition.
            <br />
            Our next conversation.
          </h2>
        </div>
        <div>
          <p>
            Behind every product is a relationship. We take the time to
            understand your range, your customers and where you want to go next.
          </p>
          <Link className="text-link" href="/about">
            Get to know Pharma Oasis
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
