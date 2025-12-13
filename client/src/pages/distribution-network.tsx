import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { DistributionNetwork } from "@/components/distribution-network";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Handshake, TrendingUp, Globe, Users } from "lucide-react";

export default function DistributionNetworkPage() {
  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Distribution Network
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              Our comprehensive distribution network connects trusted suppliers with healthcare 
              retailers across the UK, Europe and Asia, ensuring reliable supply chain solutions.
            </p>
          </div>

          <DistributionNetwork />

          {/* Partnership Opportunities Section */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium border-primary/30 text-primary">
                <Handshake className="h-4 w-4 mr-2" />
                Partnership Opportunities
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Grow Your Brand With Us
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Join our distribution network and unlock access to new markets across the UK, Europe, and Asia.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Distribution Partner Card */}
              <Card className="lg:row-span-2 overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
                    <TrendingUp className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Become a Distribution Partner
                  </h3>
                  <p className="text-muted-foreground mb-5 flex-1">
                    Looking for brand owners who want their products distributed through our extensive UK retail network. 
                    We provide direct access to pharmacies, healthcare stores, supermarkets, and convenience retailers.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Access to 3,000+ UK retail outlets</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>MHRA licensed distribution</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Dedicated account management</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>Marketing & promotional support</span>
                    </div>
                  </div>
                  <Link href="/contact">
                    <Button className="w-full gap-2" data-testid="button-partner-enquiry">
                      Partner With Us
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* UK to India Card */}
              <Card className="overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-2xl">
                      🇬🇧
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" />
                      <ArrowRight className="h-5 w-5 text-amber-500 mx-1" />
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-2xl">
                      🇮🇳
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    UK Brands → Indian Market
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access the world&apos;s largest consumer market with <span className="font-semibold text-amber-600 dark:text-amber-400">1.4 billion</span> potential customers. 
                    We help UK brands establish presence in India through our Delhi distribution centre.
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
                      <Users className="h-3 w-3 mr-1" />
                      1.4B Market
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
                      <Globe className="h-3 w-3 mr-1" />
                      Delhi DC
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* India to UK Card */}
              <Card className="overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-background to-indigo-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-blue-500/20 text-2xl">
                      🇮🇳
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-orange-400 to-blue-500 rounded-full" />
                      <ArrowRight className="h-5 w-5 text-blue-500 mx-1" />
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-2xl">
                      🇬🇧
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Indian Brands → UK Market
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Establish your brand in the UK&apos;s premium healthcare retail market. 
                    Our distribution network provides instant access to pharmacies and retailers across the UK.
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400">
                      <Users className="h-3 w-3 mr-1" />
                      UK Retail
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400">
                      <Globe className="h-3 w-3 mr-1" />
                      MHRA Licensed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CTA Banner */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 p-8 text-center">
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Ready to Expand Your Reach?
              </h3>
              <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
                Contact our partnerships team to discuss how we can help grow your brand across new markets.
              </p>
              <Link href="/contact">
                <Button size="lg" className="gap-2" data-testid="button-contact-partnerships">
                  <Handshake className="h-5 w-5" />
                  Contact Partnerships Team
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                MHRA Licensed
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Fully licensed by the MHRA for wholesale distribution of medicinal products in the UK.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Next Day Delivery
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Fast and reliable delivery across the UK mainland with next-day service available.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Dedicated Support
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our experienced team provides personalized support and account management.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}