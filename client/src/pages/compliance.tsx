import { PublicLayout } from "@/components/layout/public-layout";
import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Award, FileCheck, Truck, Building2, ClipboardCheck } from "lucide-react";

export default function CompliancePage() {
  return (
    <PublicLayout>
      <Helmet>
        <title>GDP Compliance & MHRA Licensing | Pharma Oasis</title>
        <meta 
          name="description" 
          content="Learn about Pharma Oasis's commitment to GDP compliance, MHRA WDA(H) licensing, and pharmaceutical quality systems. Licensed UK wholesale distributor." 
        />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Regulatory Compliance</Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-compliance">
            GDP Compliance & MHRA Licensing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pharma Oasis operates as a fully licensed pharmaceutical wholesaler, committed to the highest standards of quality, safety, and regulatory compliance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">MHRA WDA(H) Licence</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    We hold a Wholesale Dealer's Authorisation for Human Medicines (WDA(H)) issued by the Medicines and Healthcare products Regulatory Agency (MHRA).
                  </p>
                  <p className="text-sm">
                    <strong>Licence Number:</strong> 53820
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">GDP Compliance</h3>
                  <p className="text-muted-foreground text-sm">
                    All operations strictly adhere to Good Distribution Practice (GDP) guidelines, ensuring the quality and integrity of medicinal products throughout the supply chain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Registered Company</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Pharma Oasis Limited is registered in England and Wales, operating transparently within UK regulatory frameworks.
                  </p>
                  <p className="text-sm">
                    <strong>Company No:</strong> 11369972
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Cold Chain Capability</h3>
                  <p className="text-muted-foreground text-sm">
                    Temperature-controlled storage and distribution for products requiring specific conditions, with continuous monitoring and validated cold chain logistics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Our Quality Management System
          </h2>
          
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Our comprehensive Quality Management System (QMS) ensures consistent compliance with all applicable regulations and guidelines. Key elements include:
            </p>
            
            <ul className="space-y-3 my-6">
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Document Control:</strong> All procedures, policies, and records are maintained in accordance with GDP requirements, with regular review and approval processes.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Supplier Qualification:</strong> Rigorous due diligence on all suppliers, including verification of manufacturing and distribution licences.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Customer Verification:</strong> All customers are verified for appropriate licences and authorisations before supply.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Traceability:</strong> Complete batch traceability from source to customer, enabling rapid response to any quality issues or recalls.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Deviation Management:</strong> Formal procedures for investigating and addressing any deviations from standard processes.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Training:</strong> All personnel receive regular GDP training appropriate to their roles, with documented competency assessments.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span><strong>Internal Audits:</strong> Regular self-inspections to ensure ongoing compliance and identify areas for improvement.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Regulatory Framework</h2>
          
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              As a licensed pharmaceutical wholesaler, we operate within the following regulatory framework:
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">MHRA Oversight</h3>
            <p>
              The Medicines and Healthcare products Regulatory Agency (MHRA) is the UK regulatory body responsible for ensuring medicines and medical devices meet applicable standards of safety, quality, and efficacy. Our WDA(H) licence is subject to regular MHRA inspection.
            </p>
            <p>
              For more information about MHRA licensing requirements, visit the{" "}
              <a 
                href="https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MHRA website
              </a>.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Good Distribution Practice (GDP)</h3>
            <p>
              GDP guidelines set out the minimum standards that must be met throughout the supply chain to ensure the quality and integrity of medicinal products. Key GDP principles we follow include:
            </p>
            <ul>
              <li>Maintaining appropriate storage conditions</li>
              <li>Preventing contamination and cross-contamination</li>
              <li>Ensuring products are traceable throughout the supply chain</li>
              <li>Operating an effective quality system</li>
              <li>Maintaining proper documentation of all activities</li>
            </ul>
            <p>
              The full GDP guidelines are available on{" "}
              <a 
                href="https://www.gov.uk/guidance/good-distribution-practice-gdp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GOV.UK
              </a>.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Falsified Medicines Directive (FMD)</h3>
            <p>
              We comply with the requirements of the Falsified Medicines Directive, including the verification of unique identifiers on medicinal product packaging to prevent falsified medicines entering the legitimate supply chain.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Responsible Person</h2>
          
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              In accordance with GDP requirements, we have appointed a Responsible Person (RP) who has the required qualifications and experience to oversee our pharmaceutical distribution activities. The RP ensures:
            </p>
            <ul>
              <li>The Quality Management System is implemented and maintained</li>
              <li>Initial and continuous training programmes are established</li>
              <li>Annual self-inspections are performed</li>
              <li>Customer complaints are properly investigated and resolved</li>
              <li>Suppliers and customers are appropriately approved</li>
              <li>Recall procedures are effective and can be initiated immediately if required</li>
            </ul>
          </div>
        </section>

        <section className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Questions About Compliance?</h2>
          <p className="text-muted-foreground mb-4">
            If you have any questions about our regulatory compliance, quality systems, or licensing, please don't hesitate to contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href="/contact" 
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
              data-testid="link-contact-compliance"
            >
              Contact Us
            </a>
            <a 
              href="/how-to-order" 
              className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/90 transition-colors"
              data-testid="link-how-to-order"
            >
              How to Order
            </a>
          </div>
        </section>

        <div className="mt-8 p-4 bg-muted/30 border-l-4 border-primary rounded">
          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> The information on this page is provided for general informational purposes. For official regulatory guidance, please refer to the MHRA and GOV.UK websites. Pharma Oasis maintains all necessary licences and operates in full compliance with applicable UK pharmaceutical regulations.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
