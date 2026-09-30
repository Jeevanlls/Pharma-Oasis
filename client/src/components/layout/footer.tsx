import { Link } from "wouter";
import { useTradeSettings, whatsappHref } from "@/lib/trade-site";
export function Footer() {
  const { data: settings } = useTradeSettings();
  const email = settings?.contact_email || "trade@pharmaoasis.com";
  const phone = settings?.contact_phone || "+44 7481 640640";
  const socials = [
    ["social_instagram", "Instagram"],
    ["social_linkedin", "LinkedIn"],
    ["social_facebook", "Facebook"],
    ["social_tiktok", "TikTok"],
    ["social_twitter", "X"],
    ["social_youtube", "YouTube"],
  ].filter(([key]) => /^https?:\/\//i.test(settings?.[key] || ""));
  return (
    <footer className="future-footer">
      <div className="footer-top">
        <div>
          <span className="eyebrow">A NEW OUTLOOK ON WHOLESALE</span>
          <h2>
            Good things
            <br />
            start together.
          </h2>
        </div>
        <Link className="btn citron" href="/register">
          Become a trade partner
        </Link>
      </div>
      <div className="future-footer-links">
        <div>
          <span className="eyebrow">LET’S TALK</span>
          <a href={`mailto:${email}`}>{email}</a>
          <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>
          <Link href="/contact">Find our team & locations</Link>
        </div>
        <div>
          <span className="eyebrow">STAY CONNECTED</span>
          <a
            href={whatsappHref(settings)}
            target={settings?.whatsapp_number ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            Ask about WhatsApp trade updates
          </a>
          <div className="po-social-links">
            {socials.map(([key, label]) => (
              <a
                key={key}
                href={settings?.[key]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </div>
          <Link href="/supplier-registration">Brand partnerships</Link>
        </div>
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <Link href="/offers">Explore the weekly edit</Link>
          <Link href="/portal">Open your trade space</Link>
          <Link href="/how-to-order">How to order</Link>
          <Link href="/distribution-network">Distribution network</Link>
          <Link href="/blog">Insights</Link>
        </div>
      </div>
      <Link className="footer-wordmark" href="/" aria-label="Pharma Oasis home">
        pharma<strong>oasis</strong>
        <span aria-hidden="true">°</span>
      </Link>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Pharma Oasis Limited ·{" "}
          <Link href="/compliance">WDA(H) 53820</Link>
        </span>
        <div className="po-policy-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/compliance">Compliance</Link>
        </div>
      </div>
      <p className="po-supply-note">
        Medicines are supplied to eligible trade customers, subject to account
        approval and applicable requirements.
      </p>
    </footer>
  );
}
