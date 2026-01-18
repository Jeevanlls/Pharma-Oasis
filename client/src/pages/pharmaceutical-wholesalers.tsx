import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  Award,
  Truck,
  Package,
  CheckCircle2,
  Building2,
  FileCheck,
  Users,
  ArrowRight,
  Phone,
  Mail,
  Globe,
  BadgeCheck,
  Boxes,
  Clock,
} from "lucide-react";

const faqs = [
  {
    question: "What is a pharmaceutical wholesaler?",
    answer: "A pharmaceutical wholesaler is a licensed distributor that purchases medicines and healthcare products in bulk from manufacturers and supplies them to pharmacies, hospitals, and other healthcare providers. In the UK, pharmaceutical wholesalers must hold a Wholesale Dealer's Authorisation (WDA) from the MHRA to legally distribute medicines."
  },
  {
    question: "How do I verify a licensed pharmaceutical wholesaler in the UK?",
    answer: "You can verify a pharmaceutical wholesaler's licence by checking the MHRA's public register of licensed wholesalers. Look for a valid WDA(H) licence number and ensure the company follows Good Distribution Practice (GDP) guidelines. Pharma Oasis holds WDA licence number 53820 and is fully GDP compliant."
  },
  {
    question: "What products do pharmaceutical wholesalers supply?",
    answer: "Pharmaceutical wholesalers supply a wide range of products including prescription medicines (POM), pharmacy medicines (P), over-the-counter (OTC) medicines, medical devices, health supplements, and beauty products. The range varies by wholesaler and their specific licences."
  },
  {
    question: "What are the benefits of buying from a pharmaceutical wholesaler?",
    answer: "Buying from a pharmaceutical wholesaler offers competitive wholesale pricing, reliable supply chains, GDP-compliant storage and handling, next-day delivery options, and access to a wide product range from multiple manufacturers through a single supplier."
  },
  {
    question: "How do I become a customer of Pharma Oasis?",
    answer: "To become a Pharma Oasis customer, you need to be a registered UK pharmacy, healthcare provider, or approved wholesaler. Simply complete our online registration form with your business details, GPhC registration (for pharmacies), and we'll verify your credentials within 24-48 hours."
  },
  {
    question: "What areas do UK pharmaceutical wholesalers deliver to?",
    answer: "Pharma Oasis provides nationwide delivery across the United Kingdom, including England, Scotland, Wales, and Northern Ireland. We also support international orders for non-pharmaceutical products in compliance with local regulations."
  },
  {
    question: "What is Good Distribution Practice (GDP)?",
    answer: "Good Distribution Practice (GDP) is a quality system for pharmaceutical wholesalers that ensures medicines are stored, transported, and handled correctly to maintain their quality and integrity. GDP compliance is mandatory for all licensed pharmaceutical wholesalers in the UK and EU."
  },
  {
    question: "How do pharmaceutical wholesalers ensure medicine quality?",
    answer: "Licensed pharmaceutical wholesalers maintain medicine quality through GDP-compliant temperature-controlled storage, validated cold chain logistics, batch traceability systems, regular supplier audits, and stringent quality control procedures throughout the supply chain."
  }
];

function FAQSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}

function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://pharmaoasis.co.uk/#organization",
    "name": "Pharma Oasis",
    "alternateName": "Pharma Oasis Limited",
    "description": "MHRA-licensed pharmaceutical wholesaler and healthcare distributor serving UK pharmacies, hospitals, and healthcare providers with over 20,000 products.",
    "url": "https://pharmaoasis.co.uk",
    "logo": "https://pharmaoasis.co.uk/logo.png",
    "image": "https://pharmaoasis.co.uk/logo.png",
    "telephone": "+44 7481 640640",
    "email": "trade@pharmaoasis.com",
    "priceRange": "££",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Unit - J, Doddington Park Farmhouse, Bridgemere",
      "addressLocality": "Nantwich",
      "postalCode": "CW5 7PU",
      "addressCountry": "GB"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "53.0314",
      "longitude": "-2.4261"
    },
    "areaServed": [
      {
        "@type": "Country",
        "name": "United Kingdom"
      }
    ],
    "hasCredential": [
      {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "license",
        "name": "MHRA Wholesale Dealer's Authorisation (Human)",
        "recognizedBy": {
          "@type": "Organization",
          "name": "Medicines and Healthcare products Regulatory Agency"
        }
      }
    ],
    "sameAs": [
      "https://pharmaoasis.com"
    ],
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "17:30"
      }
    ],
    "paymentAccepted": ["Credit Card", "Debit Card", "Bank Transfer"],
    "currenciesAccepted": "GBP"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function BreadcrumbSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://pharmaoasis.co.uk/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Pharmaceutical Wholesalers UK",
        "item": "https://pharmaoasis.co.uk/pharmaceutical-wholesalers"
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function PharmaceuticalWholesalersPage() {
  return (
    <PublicLayout>
      <Helmet>
        <title>Pharmaceutical Wholesalers UK | MHRA Licensed Distributor | Pharma Oasis</title>
        <meta 
          name="description" 
          content="Leading UK pharmaceutical wholesaler with MHRA WDA licence. GDP-compliant distributor of 20,000+ medicines & healthcare products to pharmacies nationwide. Competitive wholesale pricing." 
        />
        <meta name="keywords" content="pharmaceutical wholesalers, pharmaceutical wholesaler UK, medicine wholesaler, MHRA licensed wholesaler, GDP compliant distributor, pharmacy supplier, wholesale medicines UK" />
        <link rel="canonical" href="https://pharmaoasis.co.uk/pharmaceutical-wholesalers" />
        <meta property="og:title" content="Pharmaceutical Wholesalers UK | MHRA Licensed | Pharma Oasis" />
        <meta property="og:description" content="Leading UK pharmaceutical wholesaler with MHRA WDA licence. GDP-compliant distributor of 20,000+ medicines & healthcare products to pharmacies nationwide." />
        <meta property="og:url" content="https://pharmaoasis.co.uk/pharmaceutical-wholesalers" />
        <meta property="og:type" content="website" />
      </Helmet>

      <FAQSchema />
      <LocalBusinessSchema />
      <BreadcrumbSchema />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-sidebar via-sidebar to-sidebar/95 py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm" data-testid="badge-mhra-hero">
              <Shield className="mr-1.5 h-3 w-3" />
              MHRA WDA Licensed | WDA(H) 53820
            </Badge>
            <h1 
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl" 
              style={{ fontFamily: "DM Sans, sans-serif" }}
              data-testid="text-page-title"
            >
              UK Pharmaceutical Wholesalers
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-white/80 sm:text-xl">
              <strong>Pharma Oasis</strong> is a trusted MHRA-licensed pharmaceutical wholesaler 
              supplying over 20,000 medicines and healthcare products to UK pharmacies, 
              hospitals, and healthcare providers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-register-cta">
                  Register Your Pharmacy
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto bg-white/10 text-white border-white/20 backdrop-blur-sm"
                  data-testid="button-browse-products"
                >
                  Browse Product Catalogue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-b bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-8">
            <div className="flex flex-col items-center text-center" data-testid="trust-badge-mhra">
              <div className="mb-2 rounded-full bg-muted p-3">
                <Shield className="h-6 w-6 text-foreground/80" />
              </div>
              <p className="text-sm font-medium">MHRA Licensed</p>
              <p className="text-xs text-muted-foreground">WDA(H) 53820</p>
            </div>
            <div className="flex flex-col items-center text-center" data-testid="trust-badge-gdp">
              <div className="mb-2 rounded-full bg-muted p-3">
                <BadgeCheck className="h-6 w-6 text-foreground/80" />
              </div>
              <p className="text-sm font-medium">GDP Compliant</p>
              <p className="text-xs text-muted-foreground">Quality Assured</p>
            </div>
            <div className="flex flex-col items-center text-center" data-testid="trust-badge-delivery">
              <div className="mb-2 rounded-full bg-muted p-3">
                <Truck className="h-6 w-6 text-foreground/80" />
              </div>
              <p className="text-sm font-medium">UK-Wide Delivery</p>
              <p className="text-xs text-muted-foreground">Next-Day Available</p>
            </div>
            <div className="flex flex-col items-center text-center" data-testid="trust-badge-products">
              <div className="mb-2 rounded-full bg-muted p-3">
                <Boxes className="h-6 w-6 text-foreground/80" />
              </div>
              <p className="text-sm font-medium">20,000+ Products</p>
              <p className="text-xs text-muted-foreground">Extensive Range</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Your Trusted Pharmaceutical Wholesaler in the UK</h2>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p>
                    As one of the UK's leading <strong>pharmaceutical wholesalers</strong>, Pharma Oasis provides 
                    a comprehensive range of medicines, healthcare products, and wellness items to registered 
                    pharmacies, hospitals, and healthcare providers across the United Kingdom.
                  </p>
                  <p>
                    Operating from our GDP-compliant warehouse facility, we maintain the highest standards 
                    of pharmaceutical distribution as required by the <strong>Medicines and Healthcare products 
                    Regulatory Agency (MHRA)</strong>. Our WDA(H) licence (number 53820) authorises us to 
                    wholesale human medicines throughout the UK.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Why Choose Pharma Oasis as Your Pharmaceutical Wholesaler?</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Shield className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div>
                          <h3 className="font-semibold">MHRA Licensed</h3>
                          <p className="text-sm text-muted-foreground">
                            Fully authorised WDA(H) licence holder ensuring legal and compliant medicine distribution
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Award className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div>
                          <h3 className="font-semibold">GDP Certified</h3>
                          <p className="text-sm text-muted-foreground">
                            Good Distribution Practice compliant operations maintaining medicine quality
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Package className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Extensive Product Range</h3>
                          <p className="text-sm text-muted-foreground">
                            Over 20,000 products including OTC medicines, pharmacy lines, and health supplements
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Truck className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Reliable Delivery</h3>
                          <p className="text-sm text-muted-foreground">
                            UK-wide distribution with next-day delivery options for urgent orders
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Users className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Dedicated Support</h3>
                          <p className="text-sm text-muted-foreground">
                            Expert team supporting pharmacies with orders, queries, and product sourcing
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Clock className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Competitive Pricing</h3>
                          <p className="text-sm text-muted-foreground">
                            Wholesale prices with volume discounts for regular pharmacy customers
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Products We Supply</h2>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p>
                    As a licensed <strong>pharmaceutical wholesaler</strong>, we supply a comprehensive range of products:
                  </p>
                  <ul>
                    <li><strong>Over-the-Counter (OTC) Medicines</strong> – Pain relief, cold & flu, digestive health, allergy treatments</li>
                    <li><strong>Pharmacy Medicines (P)</strong> – Products requiring pharmacist supervision</li>
                    <li><strong>General Sales List (GSL)</strong> – Widely available healthcare products</li>
                    <li><strong>Health Supplements</strong> – Vitamins, minerals, herbal remedies</li>
                    <li><strong>Personal Care</strong> – Skincare, oral care, first aid supplies</li>
                    <li><strong>Medical Devices</strong> – Diagnostic equipment, mobility aids</li>
                  </ul>
                  <p>
                    <Link href="/products" className="font-semibold underline" data-testid="link-products-catalogue">
                      Browse our full product catalogue
                    </Link> to see our complete range of wholesale pharmaceutical and healthcare products.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Our Regulatory Compliance</h2>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p>
                    Operating as a <strong>pharmaceutical wholesaler</strong> in the UK requires strict adherence 
                    to regulatory standards. Pharma Oasis maintains:
                  </p>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">MHRA Wholesale Dealer's Authorisation (Human)</p>
                      <p className="text-sm text-muted-foreground">Licence No. 53820 – Authorised to distribute human medicines</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Good Distribution Practice (GDP) Compliance</p>
                      <p className="text-sm text-muted-foreground">Temperature-controlled storage and validated supply chain</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Registered UK Company</p>
                      <p className="text-sm text-muted-foreground">Company No. 11369972 | VAT: 364 4962 68</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Learn more about our commitment to quality on our{" "}
                  <Link href="/compliance" className="font-semibold underline" data-testid="link-compliance">
                    GDP Compliance page
                  </Link>.
                </p>
              </div>

              {/* FAQ Section */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions About Pharmaceutical Wholesalers</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left" data-testid={`accordion-faq-${index}`}>
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Register as a Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Join 3,000+ UK pharmacies who trust Pharma Oasis as their pharmaceutical wholesaler.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Access wholesale pricing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Request quotes online
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Next-day delivery
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Dedicated account manager
                    </li>
                  </ul>
                  <Link href="/register">
                    <Button className="w-full gap-2" data-testid="button-sidebar-register">
                      Register Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Our Trade Team
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a 
                    href="tel:+447481640640" 
                    className="flex items-center gap-2 text-sm text-foreground"
                    data-testid="link-phone"
                  >
                    <Phone className="h-4 w-4" />
                    +44 7481 640640
                  </a>
                  <a 
                    href="mailto:trade@pharmaoasis.com" 
                    className="flex items-center gap-2 text-sm text-foreground"
                    data-testid="link-email"
                  >
                    <Mail className="h-4 w-4" />
                    trade@pharmaoasis.com
                  </a>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Unit J, Doddington Park Farmhouse<br />
                      Bridgemere, Nantwich<br />
                      CW5 7PU, United Kingdom
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/products" className="text-sm text-foreground/80 flex items-center gap-2" data-testid="link-sidebar-products">
                        <ArrowRight className="h-3 w-3" />
                        Product Catalogue
                      </Link>
                    </li>
                    <li>
                      <Link href="/brands" className="text-sm text-foreground/80 flex items-center gap-2" data-testid="link-sidebar-brands">
                        <ArrowRight className="h-3 w-3" />
                        Our Brands
                      </Link>
                    </li>
                    <li>
                      <Link href="/how-to-order" className="text-sm text-foreground/80 flex items-center gap-2" data-testid="link-sidebar-how-to-order">
                        <ArrowRight className="h-3 w-3" />
                        How to Order
                      </Link>
                    </li>
                    <li>
                      <Link href="/compliance" className="text-sm text-foreground/80 flex items-center gap-2" data-testid="link-sidebar-compliance">
                        <ArrowRight className="h-3 w-3" />
                        GDP Compliance
                      </Link>
                    </li>
                    <li>
                      <Link href="/blog" className="text-sm text-foreground/80 flex items-center gap-2" data-testid="link-sidebar-blog">
                        <ArrowRight className="h-3 w-3" />
                        Industry Insights
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-sm text-foreground/80 flex items-center gap-2" data-testid="link-sidebar-contact">
                        <ArrowRight className="h-3 w-3" />
                        Contact Us
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Licence Info */}
              <Card className="bg-muted/50" data-testid="card-licence-info">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <FileCheck className="h-8 w-8 mx-auto mb-2 text-foreground/80" />
                    <p className="font-semibold text-sm">MHRA WDA(H) Licence</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-licence-number">53820</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verify on MHRA Public Register
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-sidebar py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to Partner with a Trusted Pharmaceutical Wholesaler?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join thousands of UK pharmacies who rely on Pharma Oasis for their wholesale pharmaceutical needs.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-bottom-register">
                Register Your Business
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto bg-white/10 text-white border-white/20"
                data-testid="button-bottom-contact"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
