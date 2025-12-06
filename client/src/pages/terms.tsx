import { PublicLayout } from "@/components/layout/public-layout";

export default function TermsOfServicePage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-terms">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") govern your use of the Pharma Oasis Limited website and 
              B2B wholesale pharmaceutical distribution services. By registering an account or placing 
              orders with us, you agree to be bound by these Terms.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Pharma Oasis Limited is registered in England and Wales (Company No. 11369972), 
              VAT No. 364 4962 68, and holds MHRA Wholesale Dealer's Authorisation (Human) Licence No. 53820.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Eligibility and Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Our services are exclusively available to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Registered pharmacies with valid GPhC registration</li>
              <li>Licensed pharmaceutical wholesalers with MHRA WDA(H)</li>
              <li>Authorised healthcare providers and institutions</li>
              <li>Online retailers with appropriate licences for product categories</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Account registration is subject to verification of your regulatory credentials and approval 
              by our team. We reserve the right to reject applications or suspend accounts at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Ordering and Quotes</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Quote Requests:</strong> All prices on our platform are indicative. Formal quotes 
              are provided upon request and are valid for the period stated in the quote.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Order Confirmation:</strong> Orders are not binding until we issue written confirmation. 
              We reserve the right to refuse orders due to stock availability, credit limits, or regulatory concerns.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Minimum Order Quantities:</strong> Products may have minimum order quantities (MOQ) 
              as displayed on product listings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Pricing and Payment</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All prices are quoted in GBP and exclude VAT unless otherwise stated</li>
              <li>Prices are subject to change without notice until order confirmation</li>
              <li>Payment terms are agreed during account setup, typically 30 days from invoice date</li>
              <li>Late payments may incur interest at 8% above the Bank of England base rate</li>
              <li>We reserve the right to suspend accounts with outstanding balances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Delivery</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Delivery Terms:</strong> We offer UK-wide delivery. Delivery times are estimates 
              and are not guaranteed unless expressly agreed in writing.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Temperature-Controlled Products:</strong> Products requiring cold chain logistics 
              are shipped in accordance with GDP guidelines. You must ensure appropriate storage upon delivery.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Risk and Title:</strong> Risk passes to you upon delivery. Title remains with us 
              until full payment is received.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Returns and Complaints</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Damaged or Incorrect Goods:</strong> You must notify us within 48 hours of delivery 
              if goods are damaged, defective, or incorrect. Provide photographic evidence where possible.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>Returns:</strong> Due to pharmaceutical regulations, returns are only accepted for 
              goods that are damaged, defective, or supplied in error. Products cannot be returned once 
              the cold chain has been broken or packaging has been opened.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Recalls:</strong> In the event of a product recall, you must follow our instructions 
              and cooperate fully with any return or disposal procedures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Regulatory Compliance</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintain all necessary licences and registrations for your business activities</li>
              <li>Notify us immediately of any changes to your regulatory status</li>
              <li>Store and handle products in accordance with GDP requirements</li>
              <li>Not supply products to unlicensed or unauthorised parties</li>
              <li>Maintain appropriate records as required by MHRA and other regulators</li>
              <li>Cooperate with any regulatory audits or investigations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on our website, including logos, text, images, and software, is owned by 
              Pharma Oasis Limited or our licensors and is protected by copyright and trademark laws. 
              You may not reproduce, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Our liability for any claim is limited to the value of goods supplied</li>
              <li>We are not liable for indirect, consequential, or special damages</li>
              <li>We are not liable for delays or failures caused by circumstances beyond our control</li>
              <li>Product information is provided in good faith but you should verify suitability for your needs</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nothing in these Terms excludes liability for death or personal injury caused by negligence, 
              fraud, or any other liability that cannot be excluded by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Confidentiality</h2>
            <p className="text-muted-foreground leading-relaxed">
              Both parties agree to keep confidential any proprietary information shared during the 
              business relationship, including pricing, customer lists, and business strategies. 
              This obligation survives termination of the relationship.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate the business relationship with 30 days' written notice. 
              We may suspend or terminate your account immediately if you breach these Terms, 
              fail to maintain required licences, or engage in fraudulent activity. 
              Outstanding obligations survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Governing Law and Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of England and Wales. Any disputes shall be subject 
              to the exclusive jurisdiction of the English courts. We encourage parties to attempt to 
              resolve disputes amicably before pursuing legal action.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Significant changes will be communicated 
              via email or notice on our website. Continued use of our services after changes take 
              effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-md">
              <p className="text-sm"><strong>Pharma Oasis Limited</strong></p>
              <p className="text-sm text-muted-foreground">Unit - J, Doddington Park Farmhouse</p>
              <p className="text-sm text-muted-foreground">Bridgemere, Nantwich, CW5 7PU</p>
              <p className="text-sm text-muted-foreground">Email: trade@pharmaoasis.com</p>
              <p className="text-sm text-muted-foreground">Phone: +44 7481 640640</p>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
