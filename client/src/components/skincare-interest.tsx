import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import "@/styles/trade-preview.css";
const reviewOnly = import.meta.env.VITE_REVIEW_PREVIEW === "true";
export function BrandInterestButton({ brand, className = "tp-button", label = "Register your interest" }: { brand: "Pharma Oasis Skincare" | "OasisBiome"; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (reviewOnly) { setDone(true); return; }
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await apiRequest("POST", "/api/contact", {
        name: fields.get("name"), email: fields.get("email"), phone: fields.get("phone") || "", privacyConsent: true,
        message: [`${brand} — launch interest`, `Business: ${fields.get("company")}`, `Country: ${fields.get("country")}`, `Interested as: ${fields.get("interest")}`, `Notes: ${fields.get("notes") || "None"}`, "Consent: contact me about this collection."].join("\n"),
      });
      setDone(true);
    } catch { setError("We couldn’t register your interest. Please try again."); }
    finally { setBusy(false); }
  }
  return <><button className={className} onClick={() => { setDone(false); setError(""); setOpen(true); }}>{label} <ArrowRight size={17} /></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="tp-dialog tp-interest"><span className="tp-eyebrow">{brand.toUpperCase()}</span><DialogTitle>{done ? "A first look at what comes next." : "Be part of the conversation."}</DialogTitle><DialogDescription>{done ? reviewOnly ? "Preview complete. Your details have not been stored or sent." : "Thank you. Your interest has been registered with the Pharma Oasis team." : `Tell us about your business and your interest in ${brand}.`}</DialogDescription>{done ? <><Check size={36} /><p>{reviewOnly ? "Once the website launches, this is where future partners will receive confirmation of their interest." : "Our team will be in touch with confirmed launch and partnership information as it becomes available."}</p><button className="tp-button" onClick={() => setOpen(false)}>Back to {brand}</button></> : <form onSubmit={submit}><div className="tp-form-grid"><label>Your name<input required name="name" autoComplete="name" maxLength={100} /></label><label>Business name<input required name="company" autoComplete="organization" maxLength={150} /></label><label>Work email<input required type="email" name="email" autoComplete="email" maxLength={200} /></label><label>Country<input required name="country" autoComplete="country-name" maxLength={100} /></label><label>Telephone <small>Optional</small><input name="phone" type="tel" autoComplete="tel" maxLength={50} /></label><label>I’m interested as a<select name="interest"><option>Distributor</option><option>Wholesaler</option><option>Retailer / stockist</option><option>Brand partner</option></select></label><label className="tp-full">Tell us a little more <small>Optional</small><textarea name="notes" rows={2} maxLength={1500} placeholder="Your market, business or partnership plans…" /></label></div><label className="tp-interest-check"><input type="checkbox" required /><span>I would like Pharma Oasis to contact me about {brand} and agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">privacy policy</a>.</span></label>{error && <p className="tp-error" role="alert">{error}</p>}<button className="tp-button" type="submit" disabled={busy}>{busy ? "Registering…" : reviewOnly ? "Preview registration" : "Register my interest"}<ArrowRight size={16} /></button>{reviewOnly && <small className="tp-preview-disclaimer">Design preview: this form demonstrates the experience. It does not save your details or register your interest.</small>}</form>}</DialogContent></Dialog></>;
}
export function SkincareInterest() {
  return <section id="future-skincare" className="tp-skincare wrap"><figure><img src="/brand/pharmaoasis-skincare.webp" alt="Pharmaoasis skincare packaging concepts: gentle cleanser, hydrating serum, daily face cream and night face cream" width="1536" height="1024" loading="lazy" /><figcaption>Our future skincare collection. Packaging concepts shown.</figcaption></figure><div><span className="tp-eyebrow">THE NEXT CHAPTER / OUR OWN COLLECTION</span><h2>Pharma Oasis Skincare<br /><em>— a future collection.</em></h2><p>A new expression of everyday care is taking shape. We’re opening the conversation with future stockists, distributors and partners.</p><BrandInterestButton brand="Pharma Oasis Skincare" /><span className="tp-skincare-note">In development. Products are not yet available to order.<br />Range, formulations and launch details are to be confirmed.</span></div></section>;
}
