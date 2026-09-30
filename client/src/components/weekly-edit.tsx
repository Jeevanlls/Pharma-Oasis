import {isBarcodeReference} from "@shared/public-catalogue";
const reviewOnly = import.meta.env.VITE_REVIEW_PREVIEW === "true";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { ArrowRight, Check, Search } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { useTradePreview, type TradeProduct } from "@/lib/trade-preview";
import "@/styles/weekly-edit.css";
type Brand = {
    id: number;
    name: string;
    productCount: number;
    imageCount?: number;
};
type Range = {
    capturedAt: string;
    brands: Brand[];
    products: TradeProduct[];
    campaigns?: Campaign[];
};
type Campaign = {
    id: string;
    brandIds: number[];
    productIds: number[];
    title: string;
    description: string;
    tone: string;
    start: string;
    end: string;
    enabled: boolean;
};
const KEY = "pharmaoasis-weekly-edit-review-v1";
const seeds: Campaign[] = [
    { id: "myprotein-myvitamins", brandIds: [31, 30], productIds: [11552, 11553, 11550], title: "A stronger everyday.", description: "Explore Myprotein and Myvitamins for your next wholesale enquiry.", tone: "lime", start: "2026-09-28", end: "2026-10-04", enabled: true },
    { id: "aveeno", brandIds: [44], productIds: [1161, 1162, 1163], title: "Care, beautifully considered.", description: "A considered skincare selection from Aveeno.", tone: "oat", start: "2026-09-28", end: "2026-10-04", enabled: true },
    { id: "natures-aid", brandIds: [28], productIds: [84, 1093, 614], title: "Make room for wellbeing.", description: "Discover vitamins and supplements from Nature’s Aid.", tone: "rose", start: "2026-09-28", end: "2026-10-04", enabled: true },
    { id: "biogaia", brandIds: [41], productIds: [1534, 1536, 2211], title: "A fresh range perspective.", description: "Take a closer look at our BioGaia selection.", tone: "peach", start: "2026-09-28", end: "2026-10-04", enabled: true },
    { id: "hawkins-brimble", brandIds: [36], productIds: [9210, 9218, 9223], title: "Everyday, well groomed.", description: "Grooming essentials from Hawkins & Brimble.", tone: "stone", start: "2026-09-28", end: "2026-10-04", enabled: true },
];
export function londonDay() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function useRange() { return useQuery<Range>({ queryKey: [reviewOnly ? "/api/review/commercial-range" : "/api/trade/commercial-range"], staleTime: 60000 }); }
function readCampaigns(): Campaign[] { try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(saved) && saved.length === seeds.length && seeds.every(seed => saved.some(c => c.id === seed.id && Array.isArray(c.productIds) && Array.isArray(c.brandIds) && typeof c.start === "string" && typeof c.end === "string")))
        return saved;
}
catch { } return seeds; }
function useCampaigns() { const live = useRange(); const [campaigns, setCampaigns] = useState(readCampaigns); useEffect(() => { const update = () => setCampaigns(readCampaigns()); window.addEventListener("weekly-edit-update", update); window.addEventListener("storage", update); return () => { window.removeEventListener("weekly-edit-update", update); window.removeEventListener("storage", update); }; }, []); return reviewOnly ? campaigns : live.data?.campaigns || []; }
function selectedProducts(c: Campaign, range: Range) { return c.productIds.map(id => range.products.find(p => p.id === id && c.brandIds.includes(p.brandId))).filter((p): p is TradeProduct => !!p); }
function brandNames(c: Campaign, range: Range) { return c.brandIds.map(id => range.brands.find(b => b.id === id)?.name).filter(Boolean).join(" + "); }
function ProductPhoto({ product }: {
    product: TradeProduct;
}) { const [failed, setFailed] = useState(false); return failed ? <span className="we-image-fallback">{product.productName}</span> : <img src={product.imageUrl || ""} alt={product.productName} loading="lazy" onError={() => setFailed(true)}/>; }
function CampaignArt({ campaign, range }: {
    campaign: Campaign;
    range: Range;
}) { return <div className={`we-art we-${campaign.tone}`}><span className="we-art-label">PHARMAOASIS° / BRAND SELECTION</span><span className="we-orbit" aria-hidden="true"/><div className="we-packshots">{selectedProducts(campaign, range).slice(0, 3).map(p => <ProductPhoto key={p.id} product={p}/>)}</div><span className="we-art-brand">{brandNames(campaign, range)}</span></div>; }
function CampaignCard({ campaign, range }: {
    campaign: Campaign;
    range: Range;
}) { return <article className="we-card"><Link href={`/offers?selection=${campaign.id}`} aria-label={`Explore ${brandNames(campaign, range)}`}><CampaignArt campaign={campaign} range={range}/></Link><div className="we-card-copy"><span className="eyebrow">{brandNames(campaign, range)}</span><h3><Link href={`/offers?selection=${campaign.id}`}>{campaign.title}</Link></h3><p>{campaign.description}</p><Link href={`/offers?selection=${campaign.id}`} className="text-link">Explore the selection <ArrowRight size={16}/></Link></div></article>; }
export function WeeklyEditSection() { const { data: range, isError } = useRange(); const campaigns = useCampaigns(); const today = londonDay(); const active = campaigns.filter(c => c.enabled && c.start <= today && c.end >= today); if (!range)
    return <section className="we-section wrap"><p>{isError ? "Brand selections are temporarily unavailable." : "Loading the weekly edit…"}</p></section>; return <section className="we-section wrap"><div className="future-section-header"><div><span className="eyebrow">FRESH PERSPECTIVES FOR YOUR BUSINESS</span><h2>The weekly edit.</h2></div><Link className="text-link" href="/offers">Explore all selections <ArrowRight size={16}/></Link></div><div className="we-grid">{active.map(c => <CampaignCard key={c.id} campaign={c} range={range}/>)}</div>{!active.length && <p>The next edit is taking shape. <Link href="/products">Explore our catalogue.</Link></p>}<p className="we-note">Brand selections for trade enquiries. Pricing, availability and lead times are confirmed with your quotation.</p></section>; }
export function WeeklyOffersPage() { const { data: range } = useRange(); const campaigns = useCampaigns(); const selection = new URLSearchParams(useSearch()).get("selection"); const { add, lines } = useTradePreview(); const today = londonDay(); const campaign = campaigns.find(c => c.id === selection && c.enabled && c.start <= today && c.end >= today); return <PublicLayout><div className="we-page wrap"><span className="eyebrow">GOOD OPPORTUNITIES START WITH A CONVERSATION</span><h1>Consider your<br /><em>next selection.</em></h1><p className="we-intro">Brands we know. Products worth a closer look. Put your range together and let’s talk wholesale.</p>{campaign && range && <section className="we-detail"><CampaignArt campaign={campaign} range={range}/><div><span className="eyebrow">{brandNames(campaign, range)}</span><h2>{campaign.title}</h2><p>{campaign.description}</p><p className="we-note">Selection: {campaign.start} to {campaign.end}. No advertised discount; request your business quotation.</p><div className="we-selection-products">{selectedProducts(campaign, range).map(p => <div key={p.id}><ProductPhoto product={p}/><span><strong>{p.productName}</strong><small>{isBarcodeReference(p.ean) ? "EAN" : "Ref"} {p.ean}</small></span><button onClick={() => add(p)} disabled={lines.some(l => l.product.id === p.id)}>{lines.some(l => l.product.id === p.id) ? <><Check size={14}/>Added</> : "Add to quote"}</button></div>)}</div><div className="we-actions"><Link className="btn plum" href="/portal/quote">Open your quote <ArrowRight size={16}/></Link>{campaign.brandIds.map(id => <Link key={id} className="text-link" href={`/products?brand=${id}`}>Browse {range.brands.find(b => b.id === id)?.name} <ArrowRight size={14}/></Link>)}</div></div></section>}{selection && range && !campaign && <p>This selection is not currently scheduled. Explore the current edit below.</p>}</div><WeeklyEditSection />{reviewOnly && <div className="we-review-link wrap"><Link href="/__review/campaigns">Review the campaign editor ↗</Link><span>Design review · changes stay in this browser</span></div>}</PublicLayout>; }
export function CommercialBrandsPage() { const { data: range, isError } = useRange(); const [search, setSearch] = useState(""); const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); const brands = range?.brands.filter(b => normalize(b.name).includes(normalize(search))) || []; return <PublicLayout><section className="we-page wrap"><span className="eyebrow">A CONSIDERED COMMERCIAL RANGE</span><h1>Good brands.<br /><em>Better connections.</em></h1><p className="we-intro">Explore our supply range and start a conversation about what your business needs.</p><label className="we-brand-search"><Search size={20}/><input aria-label="Search our brands" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a brand…"/></label><p className="we-note">{range ? `${brands.length} ${brands.length === 1 ? "brand" : "brands"}` : isError ? "Brands could not be loaded. Please try again." : "Loading brands…"}</p><div className="we-brand-grid">{brands.map(b => <article key={b.id}><span className="we-brand-initial" aria-hidden="true">{b.name.slice(0, 1)}<i>°</i></span><h2>{b.name}</h2>{b.productCount ? <><p>{b.productCount.toLocaleString()} {b.productCount === 1 ? "product" : "products"} available to enquire about</p><Link className="text-link" href={`/products?brand=${b.id}`}>Explore the range <ArrowRight size={15}/></Link></> : <><p>Speak to us about the available range.</p><Link className="text-link" href="/contact">Ask about this brand <ArrowRight size={15}/></Link></>}</article>)}</div>{range && !brands.length && <p>No matching brands. Try another name.</p>}<p className="we-note">Explore our trade range. Products remain available to enquire about while photographs are being added.</p></section></PublicLayout>; }
export function CampaignStudio() { const { data: range } = useRange(); const existing = useCampaigns(); const [drafts, setDrafts] = useState(existing); const [chosen, setChosen] = useState(seeds[0].id); const [message, setMessage] = useState(""); const draft = drafts.find(c => c.id === chosen)!; const patch = (values: Partial<Campaign>) => { setDrafts(ds => ds.map(d => d.id === chosen ? { ...d, ...values } : d)); setMessage(""); }; const products = range?.products.filter(p => draft.brandIds.includes(p.brandId)) || []; const valid = drafts.every(d => d.title.trim() && d.start && d.end && d.end >= d.start && d.productIds.length > 0 && d.productIds.length <= 3 && range && d.productIds.every(id => range.products.some(p => p.id === id && d.brandIds.includes(p.brandId)))); const save = () => { if (!valid)
    return; try {
    localStorage.setItem(KEY, JSON.stringify(drafts));
    window.dispatchEvent(new Event("weekly-edit-update"));
    setMessage("Saved in this browser. The homepage and weekly edit now use your preview schedule.");
}
catch {
    setMessage("Your browser could not save these changes.");
} }; return <PublicLayout><section className="we-page wrap"><span className="eyebrow">CAMPAIGN STUDIO / DESIGN REVIEW</span><h1>Your next<br /><em>weekly edit.</em></h1><p className="we-intro">Try the weekly workflow: choose products, shape the message and set the dates. This demonstration saves only in this browser.</p><div className="we-studio"><nav aria-label="Campaigns">{drafts.map(d => <button key={d.id} className={chosen === d.id ? "active" : ""} onClick={() => { setChosen(d.id); setMessage(""); }}>{range ? brandNames(d, range) : d.id}<small>{d.enabled ? `${d.start} → ${d.end}` : "Paused"}</small></button>)}</nav><form onSubmit={e => { e.preventDefault(); save(); }}><label>Headline<input value={draft.title} maxLength={65} required onChange={e => patch({ title: e.target.value })}/></label><label>Introduction<textarea value={draft.description} maxLength={180} rows={3} onChange={e => patch({ description: e.target.value })}/></label><div className="we-date-fields"><label>First day (UK)<input type="date" required value={draft.start} onChange={e => patch({ start: e.target.value })}/></label><label>Last day (UK, inclusive)<input type="date" required min={draft.start} value={draft.end} onChange={e => patch({ end: e.target.value })}/></label></div><label>Colour palette<select value={draft.tone} onChange={e => patch({ tone: e.target.value })}>{["lime", "oat", "rose", "peach", "stone"].map(t => <option key={t}>{t}</option>)}</select></label><label className="we-checkbox"><input type="checkbox" checked={draft.enabled} onChange={e => patch({ enabled: e.target.checked })}/>Include in scheduled edit</label><fieldset><legend>Choose 1–3 real product photographs</legend><div className="we-product-picker">{products.map(p => <label key={p.id}><input type="checkbox" checked={draft.productIds.includes(p.id)} disabled={!draft.productIds.includes(p.id) && draft.productIds.length >= 3} onChange={e => patch({ productIds: e.target.checked ? [...draft.productIds, p.id] : draft.productIds.filter(id => id !== p.id) })}/><ProductPhoto product={p}/><span>{p.productName}<small>{p.ean}</small></span></label>)}</div></fieldset>{!valid && <p className="we-error">Each campaign needs a headline, a valid date range and 1–3 matching products.</p>}<button className="btn plum" type="submit" disabled={!valid}>Save review schedule <Check size={16}/></button><p role="status">{message}</p><Link className="text-link" href="/offers">View the weekly edit <ArrowRight size={16}/></Link></form><aside>{range && <CampaignCard campaign={draft} range={range}/>}<p className="we-note">Real EAN-matched packshots. No supplier costs, customer prices or invented discounts. Scheduled dates use Europe/London.</p><p className="we-note">Live staff permissions, shared saving and social image export are still to be connected to the production offers backend.</p></aside></div></section></PublicLayout>; }
