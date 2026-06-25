import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Building2, Tag, FileUp, PoundSterling, Coins, Users,
  ArrowRight, Lightbulb, ShieldCheck, CalendarClock,
} from "lucide-react";

interface Step {
  n: number;
  title: string;
  href: string;
  icon: typeof Building2;
  optional?: boolean;
  what: string;
  points: string[];
  when: string;
}

const steps: Step[] = [
  {
    n: 1, title: "Brands", href: "/admin/pricing-brands", icon: Building2,
    what: "Add each brand you sell and price. A brand is the container that holds that brand's costs and price lists.",
    points: [
      "Click Add brand, name it, save.",
      "These pricing brands are separate from the public catalogue brands — they don't have to match.",
      "Everything else hangs off a brand: you upload costs for a brand, and build price lists for a brand.",
    ],
    when: "When you start selling a new brand.",
  },
  {
    n: 2, title: "Categories", href: "/admin/pricing-categories", icon: Tag, optional: true,
    what: "Just groups for your products (e.g. “Vitamins”, “Pain relief”).",
    points: [
      "You usually don't need to touch this.",
      "Uploading a cost file with Category: headings creates them automatically.",
      "Come here only to rename or tidy them.",
    ],
    when: "When you want to clean up category names. Otherwise skip it.",
  },
  {
    n: 3, title: "Cost Uploads", href: "/admin/cost-uploads", icon: FileUp,
    what: "Load what you pay (your supplier costs) for a brand.",
    points: [
      "Download template → fill in barcode, cost, quantity, Notes (one brand per file).",
      "Upload & preview → the screen sorts every line: duplicate, missing info, cost changed, new, unchanged.",
      "Fix duplicates (you can't publish with them); big cost jumps need a confirm tick; missing-info lines are skipped.",
      "Missing products from last time can be kept (at old cost) or removed.",
      "Publish — make these costs live. Nothing is live until you publish.",
    ],
    when: "When your supplier sends new cost prices.",
  },
  {
    n: 4, title: "Current Costs", href: "/admin/current-costs", icon: PoundSterling, optional: true,
    what: "A shortcut to fix a few live costs without re-uploading a whole file.",
    points: [
      "Pick a brand → see live costs + how long ago they were published.",
      "Type a new cost / note on just the lines you need.",
      "Review & apply shows exactly which customer prices will change.",
      "Nothing changes until you press Confirm & apply — then it republishes and reprices automatically.",
    ],
    when: "When one or two costs are wrong and you don't want a full upload.",
  },
  {
    n: 5, title: "Price Lists", href: "/admin/price-builder", icon: Coins,
    what: "The heart of it: turn your costs into the selling prices customers see.",
    points: [
      "New Price List → pick a brand → it auto-fills every product at your default margin.",
      "Set prices by Margin %, Fixed £, or Cost + £ — per line, all at once, or by cost bands.",
      "See live customer price, real margin, and a red “below cost!” warning. Save when happy.",
      "Assign to customers (one list per customer per brand). Preview as customer shows what they see.",
      "When new costs are published, click Check for cost changes → review → Apply to list.",
    ],
    when: "When setting up prices for a brand, or updating after a cost change.",
  },
  {
    n: 6, title: "Who Sees What", href: "/admin/assignments", icon: Users,
    what: "A read-only overview: for each brand, every price list and the customers on it.",
    points: [
      "Lists with no customers are flagged in amber so gaps stand out.",
      "Search by customer, list, or brand.",
      "To change an assignment, go to Price Lists and use Assign.",
    ],
    when: "When you want to check, at a glance, who's getting which prices.",
  },
];

const rules = [
  "Customers never see cost or margin — only their final price.",
  "One price list per customer, per brand. (A different brand can have a different list; the same brand can't have two.) Enforced — it offers to swap.",
  "Costs must be Published before they reach a price list.",
  "“Check for cost changes” always compares against the latest published costs, not a draft.",
  "Big cost jumps, customer-price impacts, and deletions all ask before they happen.",
];

const glossary: [string, string][] = [
  ["Cost", "What you pay the supplier. Never shown to customers."],
  ["Margin %", "Your mark-up. 20% on a £10 cost = £12 selling price."],
  ["Selling / customer price", "What the customer pays and sees."],
  ["Publish", "Make an upload's costs live so price lists can use them."],
  ["Price list", "A set of selling prices for one brand, given to chosen customers."],
  ["Assign", "Attach a price list to a customer so they see those prices."],
  ["Check for cost changes", "Compare a saved list to the latest published costs and review what moved."],
  ["Cost band", "A cost range with its own margin, for bulk pricing."],
];

export default function PricingGuidePage() {
  return (
    <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-5">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <BookOpen className="h-6 w-6" /> Customer Pricing — How this works
          </h1>
          <p className="text-muted-foreground mt-1">
            Where you set the prices specific customers see, brand by brand — without ever exposing your cost or margin.
          </p>
          <div className="mt-3 flex items-start gap-2 text-sm rounded-md bg-emerald-100/70 dark:bg-emerald-900/30 p-3">
            <Lightbulb className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
            <span><b>The golden rule:</b> customers only ever see their final selling price. Never your cost, your margin, or anyone else's list.</span>
          </div>
        </div>

        {/* Big picture flow */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">The big picture</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
              {steps.map((s, i) => (
                <span key={s.n} className="flex items-center gap-1">
                  <Link href={s.href}>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 hover:bg-emerald-100 cursor-pointer">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{s.n}</span> {s.title}
                    </span>
                  </Link>
                  {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Steps 1–4 get your <b>costs</b> in. Step 5 turns costs into <b>selling prices</b>. Step 6 shows <b>who gets them</b>.
              You don't redo every step each time — see the monthly routine below.
            </p>
          </CardContent>
        </Card>

        {/* Steps */}
        {steps.map((s) => (
          <Card key={s.n} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shrink-0">{s.n}</span>
                  <span className="flex items-center gap-2"><s.icon className="h-4 w-4 text-emerald-600" /> {s.title}</span>
                  {s.optional && <Badge variant="secondary">optional</Badge>}
                </CardTitle>
                <Link href={s.href}>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
                    Open this screen <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pl-[4.25rem]">
              <p className="text-sm font-medium">{s.what}</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                {s.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <p className="text-xs"><span className="font-semibold text-emerald-700 dark:text-emerald-400">Do this when:</span> {s.when}</p>
            </CardContent>
          </Card>
        ))}

        {/* Key rules */}
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Key rules to remember</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 list-disc pl-4">
              {rules.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </CardContent>
        </Card>

        {/* Monthly routine */}
        <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-600" /> The monthly routine (short version)</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm space-y-1.5 list-decimal pl-4">
              <li><b>Cost Uploads</b> → upload the new file for the brand → review → <b>Publish</b>.</li>
              <li><b>Price Lists</b> → open each list for that brand → <b>Check for cost changes</b> → review → <b>Apply to list</b>.</li>
              <li>Done — assigned customers now see the new prices.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">For a quick one-off fix instead of a full upload, use <b>Current Costs</b>.</p>
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Mini glossary</CardTitle></CardHeader>
          <CardContent>
            <dl className="text-sm divide-y">
              {glossary.map(([term, def]) => (
                <div key={term} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-2">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="text-muted-foreground">{def}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
  );
}
