import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, FileText, Search, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import "@/styles/how-to-order.css";

const steps = [
  { title: "Make an introduction.", tag: "YOUR BUSINESS", text: "Apply for a trade account in two short steps. Add your contact and address details, with company and licence information where relevant." },
  { title: "Leave the review to us.", tag: "ACCOUNT APPROVAL", text: "Our team reviews your business and any applicable supply requirements. We’ll contact you if we need more information and email you when your account is ready." },
  { title: "Find your next line.", tag: "THE CATALOGUE", text: "Search by product name, brand or EAN. Explore categories and the weekly edit, then select the products and quantities you need." },
  { title: "Build your buying list.", tag: "YOUR QUOTE", text: "Add products to your quote basket and include any special requirements. Check the product references, quantities and delivery details before sending." },
  { title: "Get the details agreed.", tag: "PERSONAL SERVICE", text: "Our sales team confirms pricing, availability and any minimum quantities. View your quote requests and their progress in your trade space." },
  { title: "From quote to delivery.", tag: "YOUR ORDER", text: "Confirm your quotation with our team. We’ll agree payment and delivery arrangements before your order is fulfilled." },
];
const faqs = [
  ["Who is a trade account for?", "We welcome enquiries from retailers, online businesses, pharmacies, wholesalers, distributors and other trade buyers. Available product ranges depend on your business and account approval. Our team will confirm any relevant licence requirements."],
  ["Do I need every company detail to apply?", "Start with your business name and type, a main contact, email, telephone number and business address. Extra company details and preferences are optional. Add applicable licence information if you have it; our team will follow up on anything needed for approval."],
  ["Why are some prices on request?", "Pricing can depend on your account, quantities and the products you need. Request a quote for our team to confirm the details. If account prices have been set up for you, eligible priced items can also be ordered through your trade space."],
  ["Are there minimum quantities or case sizes?", "Check the product details and the quantity unit shown when building your list. Where case sizes or minimum quantities apply, our team will confirm them with your quotation."],
  ["How are payment and delivery arranged?", "Payment terms, delivery charges and expected dispatch dates are agreed with your order. Tell us about your destination or any special handling requirements when requesting a quote."],
  ["Where can I follow up on a quote?", "Sign in to your trade space to view your requests and their status. If you need help with an existing request, contact our team with your quote reference."],
];

export default function HowToOrderPage() {
  return <PublicLayout><PageTracker title="How to order — Pharma Oasis" />
    <div className="hto-page wrap">
      <nav className="hto-breadcrumb" aria-label="Breadcrumb"><Link href="/compliance">Compliance</Link><span aria-hidden="true">/</span><span aria-current="page">How to order</span></nav>
      <section className="hto-hero" aria-labelledby="hto-title">
        <div><span className="eyebrow">HOW TO ORDER</span><h1 id="hto-title">Good business.<br /><em>Made simple.</em></h1><p>A considered range. A quote that works for you. A team to help you bring it all together.</p>
          <div className="hto-actions"><Link className="btn plum" href="/register">Become a trade partner <ArrowRight size={17} /></Link><Link className="text-link" href="/portal">Already a partner? Sign in</Link></div>
        </div>
        <aside className="hto-note" aria-label="Trade ordering at a glance"><span className="eyebrow">YOUR NEXT ORDER STARTS HERE</span><h2>Your products.<br />Your quantities.<br /><em>Your quotation.</em></h2><p>Tell us what you need. We’ll confirm the price, availability and delivery details with you.</p><Link href="/products">Explore the catalogue <ArrowUpRight size={20} /></Link></aside>
      </section>
      <section className="hto-process" aria-labelledby="hto-process-title"><div className="hto-section-head"><div><span className="eyebrow">FROM FIRST HELLO TO YOUR NEXT DELIVERY</span><h2 id="hto-process-title">A clear path forward.</h2></div><span>Six steps. One trade partner.</span></div>
        <ol className="hto-steps">{steps.map((step,i)=><li key={step.title}><div className="hto-step-top"><span>{String(i+1).padStart(2,"0")}</span><small>{step.tag}</small></div><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
      </section>
      <section className="hto-strip" aria-label="A few things to know"><div><Search size={21} /><span><strong>Find the exact product</strong>Search with an EAN or product name.</span></div><div><FileText size={21} /><span><strong>Keep it in your trade space</strong>Your quote requests and order history.</span></div><div><ShieldCheck size={21} /><span><strong>Supply with care</strong>Accounts and relevant requirements reviewed.</span></div></section>
      <section className="hto-faq" aria-labelledby="hto-faq-title"><div><span className="eyebrow">A LITTLE MORE CLARITY</span><h2 id="hto-faq-title">Before we<br /><em>get started.</em></h2><p>Questions about your business or a particular range? Our team can help.</p><Link className="text-link" href="/contact">Talk to us <ArrowUpRight size={16} /></Link></div><div className="hto-questions">{faqs.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
      <section className="hto-ready"><div><span className="eyebrow">LET’S TAKE THE NEXT STEP</span><h2>What’s on your buying list?</h2><p><Check size={16} /> Start with a trade account, or explore what’s possible.</p></div><div className="hto-actions"><Link className="btn citron" href="/register">Apply for an account <ArrowRight size={17} /></Link><Link className="hto-ready-link" href="/products">Browse products <ArrowUpRight size={17} /></Link></div></section>
    </div>
  </PublicLayout>;
}
