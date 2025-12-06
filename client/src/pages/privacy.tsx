import { PublicLayout } from "@/components/layout/public-layout";

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-privacy">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pharma Oasis Limited ("we", "our", "us") is committed to protecting and respecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
              visit our website and use our B2B wholesale pharmaceutical distribution services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We are registered in England and Wales (Company No. 11369972) and operate as a licensed 
              pharmaceutical wholesaler under MHRA WDA(H) Licence No. 53820.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Business Information:</strong> Company name, trading name, business address, company registration number, VAT number</li>
              <li><strong>Contact Information:</strong> Name, email address, telephone number, job title</li>
              <li><strong>Regulatory Information:</strong> GPhC registration number, MHRA licence details, NHS/ODS codes, premises registration</li>
              <li><strong>Account Information:</strong> Username, password (encrypted), account preferences</li>
              <li><strong>Transaction Information:</strong> Quote requests, order history, payment details, delivery addresses</li>
              <li><strong>Communication Records:</strong> Correspondence via email, phone, or our contact forms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process and manage your customer account registration and approval</li>
              <li>Verify your regulatory status and eligibility to purchase pharmaceutical products</li>
              <li>Process quote requests and fulfil orders</li>
              <li>Communicate with you about your account, orders, and our services</li>
              <li>Comply with legal and regulatory obligations, including MHRA and GDP requirements</li>
              <li>Maintain records as required by pharmaceutical distribution regulations</li>
              <li>Improve our website and services</li>
              <li>Detect and prevent fraud or other unlawful activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Legal Basis for Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under the UK General Data Protection Regulation (UK GDPR), we process your data based on:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Contract Performance:</strong> To provide our wholesale services and fulfil orders</li>
              <li><strong>Legal Obligation:</strong> To comply with MHRA regulations, GDP requirements, and other applicable laws</li>
              <li><strong>Legitimate Interests:</strong> To operate and improve our business, provided this does not override your rights</li>
              <li><strong>Consent:</strong> For marketing communications, where applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Delivery Partners:</strong> Courier and logistics companies to fulfil deliveries</li>
              <li><strong>Payment Processors:</strong> Secure payment service providers</li>
              <li><strong>Regulatory Bodies:</strong> MHRA, GPhC, or other authorities when required by law</li>
              <li><strong>Professional Advisors:</strong> Accountants, lawyers, and auditors as necessary</li>
              <li><strong>Service Providers:</strong> IT, hosting, and customer service platforms that support our operations</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data for as long as necessary to fulfil the purposes for which it was 
              collected, including to satisfy legal, regulatory, accounting, or reporting requirements. 
              For pharmaceutical distribution records, we are required to retain transaction data for a 
              minimum of 5 years in accordance with GDP regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organisational measures to protect your personal data 
              against unauthorised access, alteration, disclosure, or destruction. This includes encrypted 
              data transmission, secure password storage, access controls, and regular security assessments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under UK GDPR, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to legal retention requirements)</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Portability:</strong> Request transfer of your data to another provider</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise these rights, please contact us at trade@pharmaoasis.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is primarily processed within the United Kingdom. Where we transfer data outside 
              the UK, we ensure appropriate safeguards are in place in accordance with UK GDPR requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-md">
              <p className="text-sm"><strong>Pharma Oasis Limited</strong></p>
              <p className="text-sm text-muted-foreground">Unit - J, Doddington Park Farmhouse</p>
              <p className="text-sm text-muted-foreground">Bridgemere, Nantwich, CW5 7PU</p>
              <p className="text-sm text-muted-foreground">Email: trade@pharmaoasis.com</p>
              <p className="text-sm text-muted-foreground">Phone: +44 7481 640640</p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) 
              at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a>.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
