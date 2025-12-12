import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Skeleton } from "@/components/ui/skeleton";
import type { FooterSection } from "@shared/schema";

const defaultTermsContent = `<section>
<h2>1. Introduction</h2>
<p>These Terms of Service ("Terms") govern your use of the Pharma Oasis Limited website and B2B wholesale pharmaceutical distribution services. By registering an account or placing orders with us, you agree to be bound by these Terms.</p>
<p>Pharma Oasis Limited is registered in England and Wales (Company No. 11369972), VAT No. 364 4962 68, and holds MHRA Wholesale Dealer's Authorisation (Human) Licence No. 53820.</p>
</section>

<section>
<h2>2. Eligibility and Account Registration</h2>
<p>Our services are exclusively available to:</p>
<ul>
<li>Registered pharmacies with valid GPhC registration</li>
<li>Licensed pharmaceutical wholesalers with MHRA WDA(H)</li>
<li>Authorised healthcare providers and institutions</li>
<li>Online retailers with appropriate licences for product categories</li>
</ul>
<p>Account registration is subject to verification of your regulatory credentials and approval by our team. We reserve the right to reject applications or suspend accounts at our discretion.</p>
</section>

<section>
<h2>3. Ordering and Quotes</h2>
<p><strong>Quote Requests:</strong> All prices on our platform are indicative. Formal quotes are provided upon request and are valid for the period stated in the quote.</p>
<p><strong>Order Confirmation:</strong> Orders are not binding until we issue written confirmation. We reserve the right to refuse orders due to stock availability, credit limits, or regulatory concerns.</p>
<p><strong>Minimum Order Quantities:</strong> Products may have minimum order quantities (MOQ) as displayed on product listings.</p>
</section>

<section>
<h2>4. Pricing and Payment</h2>
<ul>
<li>All prices are quoted in GBP and exclude VAT unless otherwise stated</li>
<li>Prices are subject to change without notice until order confirmation</li>
<li>Payment terms are agreed during account setup, typically 30 days from invoice date</li>
<li>Late payments may incur interest at 8% above the Bank of England base rate</li>
<li>We reserve the right to suspend accounts with outstanding balances</li>
</ul>
</section>

<section>
<h2>5. Delivery</h2>
<p><strong>Delivery Terms:</strong> We offer UK-wide delivery. Delivery times are estimates and are not guaranteed unless expressly agreed in writing.</p>
<p><strong>Temperature-Controlled Products:</strong> Products requiring cold chain logistics are shipped in accordance with GDP guidelines. You must ensure appropriate storage upon delivery.</p>
<p><strong>Risk and Title:</strong> Risk passes to you upon delivery. Title remains with us until full payment is received.</p>
</section>

<section>
<h2>6. Returns and Complaints</h2>
<p><strong>Damaged or Incorrect Goods:</strong> You must notify us within 48 hours of delivery if goods are damaged, defective, or incorrect. Provide photographic evidence where possible.</p>
<p><strong>Returns:</strong> Due to pharmaceutical regulations, returns are only accepted for goods that are damaged, defective, or supplied in error. Products cannot be returned once the cold chain has been broken or packaging has been opened.</p>
<p><strong>Recalls:</strong> In the event of a product recall, you must follow our instructions and cooperate fully with any return or disposal procedures.</p>
</section>

<section>
<h2>7. Regulatory Compliance</h2>
<p>You agree to:</p>
<ul>
<li>Maintain all necessary licences and registrations for your business activities</li>
<li>Notify us immediately of any changes to your regulatory status</li>
<li>Store and handle products in accordance with GDP requirements</li>
<li>Not supply products to unlicensed or unauthorised parties</li>
<li>Maintain appropriate records as required by MHRA and other regulators</li>
<li>Cooperate with any regulatory audits or investigations</li>
</ul>
</section>

<section>
<h2>8. Intellectual Property</h2>
<p>All content on our website, including logos, text, images, and software, is owned by Pharma Oasis Limited or our licensors and is protected by copyright and trademark laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>
</section>

<section>
<h2>9. Limitation of Liability</h2>
<p>To the maximum extent permitted by law:</p>
<ul>
<li>Our liability for any claim is limited to the value of goods supplied</li>
<li>We are not liable for indirect, consequential, or special damages</li>
<li>We are not liable for delays or failures caused by circumstances beyond our control</li>
<li>Product information is provided in good faith but you should verify suitability for your needs</li>
</ul>
<p>Nothing in these Terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.</p>
</section>

<section>
<h2>10. Confidentiality</h2>
<p>Both parties agree to keep confidential any proprietary information shared during the business relationship, including pricing, customer lists, and business strategies. This obligation survives termination of the relationship.</p>
</section>

<section>
<h2>11. Termination</h2>
<p>Either party may terminate the business relationship with 30 days' written notice. We may suspend or terminate your account immediately if you breach these Terms, fail to maintain required licences, or engage in fraudulent activity. Outstanding obligations survive termination.</p>
</section>

<section>
<h2>12. Governing Law and Disputes</h2>
<p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the English courts. We encourage parties to attempt to resolve disputes amicably before pursuing legal action.</p>
</section>

<section>
<h2>13. Changes to Terms</h2>
<p>We may update these Terms from time to time. Significant changes will be communicated via email or notice on our website. Continued use of our services after changes take effect constitutes acceptance of the revised Terms.</p>
</section>

<section>
<h2>14. Contact Us</h2>
<p>For questions about these Terms of Service, please contact:</p>
<p><strong>Pharma Oasis Limited</strong><br/>
Unit - J, Doddington Park Farmhouse<br/>
Bridgemere, Nantwich, CW5 7PU<br/>
Email: trade@pharmaoasis.com<br/>
Phone: +44 7481 640640</p>
</section>`;

export default function TermsOfServicePage() {
  const { data: section, isLoading } = useQuery<FooterSection>({
    queryKey: ["/api/footer-sections", "terms_of_service"],
    queryFn: async () => {
      const res = await fetch("/api/footer-sections/terms_of_service");
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    retry: false,
  });

  const content = section?.content || defaultTermsContent;
  const lastUpdated = section?.updatedAt 
    ? new Date(section.updatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "December 2024";

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-terms">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div 
            className="prose prose-slate dark:prose-invert max-w-none [&_section]:mb-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-4 [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_ul]:space-y-2 [&_li]:text-muted-foreground [&_a]:text-primary [&_a:hover]:underline"
            dangerouslySetInnerHTML={{ __html: content }}
            data-testid="content-terms"
          />
        )}
      </div>
    </PublicLayout>
  );
}
