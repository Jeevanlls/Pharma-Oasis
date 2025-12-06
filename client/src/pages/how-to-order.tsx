import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Search, 
  ShoppingCart, 
  FileText, 
  CheckCircle, 
  Package,
  ArrowRight,
  Shield,
  Clock,
  HelpCircle,
  Phone,
  Mail,
} from "lucide-react";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Register Your Business",
    description: "Complete our online registration form with your business details. We require proof of your pharmacy licence or healthcare provider status.",
    details: [
      "Fill out the multi-step registration form",
      "Provide company and contact information",
      "Submit regulatory compliance details",
      "Our team reviews applications within 24-48 hours",
    ],
  },
  {
    number: 2,
    icon: CheckCircle,
    title: "Account Approval",
    description: "Our team verifies your credentials and activates your account. You'll receive an email confirmation when approved.",
    details: [
      "Verification of business registration",
      "Licence and compliance checks",
      "Credit terms assessment",
      "Welcome email with account access",
    ],
  },
  {
    number: 3,
    icon: Search,
    title: "Browse Products",
    description: "Access our full catalogue of 20,000+ healthcare products with wholesale pricing visible to approved customers.",
    details: [
      "Search by product name, SKU, or brand",
      "Filter by category and brand",
      "View wholesale prices and MOQs",
      "Check product availability",
    ],
  },
  {
    number: 4,
    icon: ShoppingCart,
    title: "Build Your Quote Basket",
    description: "Add products to your quote basket with desired quantities. You can save and modify your basket anytime.",
    details: [
      "Add products with custom quantities",
      "Review and adjust items",
      "Add notes for special requirements",
      "Basket persists across sessions",
    ],
  },
  {
    number: 5,
    icon: FileText,
    title: "Submit Quote Request",
    description: "Submit your basket as a quote request. Our sales team reviews and provides a formal quotation.",
    details: [
      "One-click submission",
      "Include any special notes",
      "Receive confirmation email",
      "Track quote status in your account",
    ],
  },
  {
    number: 6,
    icon: Package,
    title: "Receive & Order",
    description: "Review your quotation, accept the terms, and your order is processed for delivery.",
    details: [
      "Review quoted prices",
      "Accept or negotiate",
      "Order confirmation",
      "Fast UK-wide delivery",
    ],
  },
];

const faqs = [
  {
    question: "Who can register for a wholesale account?",
    answer: "We supply to UK-based pharmacies, hospitals, clinics, care homes, and other licensed healthcare providers. You'll need to provide proof of your licence or registration during the application process.",
  },
  {
    question: "How long does account approval take?",
    answer: "Most applications are reviewed within 24-48 hours during business days. Complex applications requiring additional verification may take slightly longer.",
  },
  {
    question: "What payment terms are available?",
    answer: "Payment terms are assessed on a case-by-case basis during account setup. Options may include credit accounts (subject to approval), pro-forma, or payment on delivery.",
  },
  {
    question: "Is there a minimum order value?",
    answer: "Individual products may have minimum order quantities (MOQs). There is no blanket minimum order value for quote requests, though some products may have specific requirements.",
  },
  {
    question: "How does delivery work?",
    answer: "We offer next-day delivery across mainland UK for orders placed before our cut-off time. Temperature-sensitive products are shipped via cold chain logistics.",
  },
  {
    question: "Can I track my quotes and orders?",
    answer: "Yes, you can view all your quote requests and their status in your account dashboard. You'll also receive email notifications for important updates.",
  },
];

export default function HowToOrderPage() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-sidebar to-sidebar/95 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            Simple Process
          </Badge>
          <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
            How to Order
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto">
            Our quote-based ordering system is designed to give you competitive pricing and 
            personalized service. Here's how it works.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              The Ordering Process
            </h2>
            <p className="mt-4 text-muted-foreground">
              Six simple steps from registration to delivery
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-muted -translate-x-1/2" />
            
            <div className="space-y-8 lg:space-y-0">
              {steps.map((step, index) => (
                <div 
                  key={step.number}
                  className={`lg:flex lg:items-center lg:gap-12 ${
                    index % 2 === 0 ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  <div className="lg:w-1/2 lg:py-8">
                    <Card className={`${index % 2 === 0 ? "lg:ml-auto lg:mr-6" : "lg:mr-auto lg:ml-6"} max-w-lg`}>
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                            {step.number}
                          </div>
                          <step.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {step.title}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {step.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {step.details.map((detail, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="hidden lg:flex lg:w-0 items-center justify-center relative z-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                      {step.number}
                    </div>
                  </div>

                  <div className="hidden lg:block lg:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Secure Ordering</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is protected with industry-standard encryption. All transactions are secure.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Fast Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Quotes are typically processed within hours. Orders ship same-day before cut-off.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Reliable Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  UK-wide next-day delivery with temperature-controlled options for sensitive products.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <HelpCircle className="mx-auto h-10 w-10 text-primary mb-4" />
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl mb-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Need Help Getting Started?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8">
            Our team is here to assist you through the registration and ordering process.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              className="w-full sm:w-auto gap-2 bg-white text-primary hover:bg-white/90"
              asChild
            >
              <a href="tel:+442012345678">
                <Phone className="h-4 w-4" />
                Call Us
              </a>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto gap-2 bg-transparent text-white border-white/30 hover:bg-white/10"
              asChild
            >
              <a href="mailto:trade@pharmaoasis.com">
                <Mail className="h-4 w-4" />
                Email Us
              </a>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
