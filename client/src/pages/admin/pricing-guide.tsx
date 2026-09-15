import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Building2, Tag, FileUp, PoundSterling, Coins, Users,
  ArrowRight, Lightbulb, ShieldCheck, CalendarClock, Megaphone,
  Rocket, Mail, CircleAlert,
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
    what: "Groups for your products (e.g. “Vitamins”, “Pain relief”). They also let you build one price list that spans a category across every brand (see step 5).",
    points: [
      "Uploading a cost file with Category: headings creates them automatically — you usually don't add them by hand.",
      "Come here to rename or tidy them.",
      "Tidy names matter more now: a clean category can become a Category price list in step 5.",
    ],
    when: "When you want to clean up category names, or before building a category price list.",
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
      "Add product: add a single new line by hand (EAN, description, cost, category). The EAN is checked live for duplicates — it blocks a repeat in the same brand and warns if it exists under another.",
    ],
    when: "When one or two costs are wrong and you don't want a full upload.",
  },
  {
    n: 5, title: "Price Lists", href: "/admin/price-builder", icon: Coins,
    what: "The heart of it: turn your costs into the selling prices customers see — for one brand, or for a whole category across brands.",
    points: [
      "New Price List → choose Brand (one brand's products) or Category (the same category across every brand) → it auto-fills at your default margin.",
      "Set prices by Margin %, Fixed £, or Cost + £ — per line, all at once, or by cost bands.",
      "Smart pricing: round every price to a tidy ending — .49/.99 (£5.74 → £5.99) or nearest .x9 (£5.74 → £5.79). Fixed prices are left exactly as typed.",
      "No cost yet? The product still appears to customers as “Price on request” — they add it and request a quote (it never becomes a £0 price). Add a cost later and Check for cost changes to give it a live price.",
      "See live customer price, real margin, and a red “below cost!” warning. Save when happy.",
      "Assign to customers: a customer can hold one brand list AND one category list at once — where they overlap, the brand price wins. Use Preview impact in the Assign box to see exactly which prices change before you commit.",
      "When new costs are published, click Check for cost changes → review → Apply to list. Cost edits also flow through to any category list that includes those products.",
    ],
    when: "When setting up prices for a brand or a category, or updating after a cost change.",
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
  {
    n: 7, title: "Promotions", href: "/admin/promotions", icon: Megaphone,
    what: "Time-limited deals shown to every customer. While a promotion is live, its price overrides brand and category list prices for those products — then reverts automatically.",
    points: [
      "New promotion → set a start & end date (or leave open-ended) → it goes live and ends on its own.",
      "Search the pricing catalogue, add products, and set one promo price each — the same for every customer.",
      "Publish to go live. Those products then show the promo price everywhere — the customer's Promotions tab and their normal catalogue — and revert when it ends.",
      "Promotions are global: no assigning. Unpublish or Archive to pull one early.",
    ],
    when: "When you're running this month's offers across one or more brands or categories.",
  },
];

const rules = [
  "Customers never see cost or margin — only their final price.",
  "A customer can hold one brand list and one category list at the same time. The same brand (or the same category) can't have two — it offers to swap.",
  "When a product sits on both a brand and a category list, the brand price wins. A live promotion beats both.",
  "Promotions are the same for everyone and switch on/off by their dates — you never assign or un-assign them.",
  "Costs must be Published before they reach a price list. Cost edits reprice brand and category lists alike.",
  "A product with no cost is never sold at £0 — it shows as “Price on request” and the customer requests a quote, which you price and they accept.",
  "“Check for cost changes” always compares against the latest published costs, not a draft.",
  "Big cost jumps, customer-price impacts, and deletions all ask before they happen.",
];

const glossary: [string, string][] = [
  ["Cost", "What you pay the supplier. Never shown to customers."],
  ["Rate card", "What we charge, written down once. Every customer sits on exactly one; the brand price lists are built from it."],
  ["House rate", "The card new customers land on. Currently Standard, 20%."],
  ["Exception", "One brand, one customer, at its own rate. Beats their card for that brand, and a house-wide change never touches it."],
  ["Daily run", "The step that carries newly published costs into customer prices. Publishing alone does not."],
  ["Margin %", "Your mark-up on cost. 20% on a £10 cost = £12 selling price. (For 20% margin on the selling price, you would set 25.)"],
  ["Selling / customer price", "What the customer pays and sees."],
  ["Publish", "Make an upload's costs live so price lists can use them."],
  ["Price list", "A set of selling prices for one brand, given to chosen customers."],
  ["Category list", "Selling prices for a whole category across every brand, given to chosen customers."],
  ["Promotion", "A time-limited deal shown to all customers; its price overrides brand & category lists while it's live, then reverts."],
  ["Brand-wins", "When a product is on both a brand and a category list, the brand price is the one used."],
  ["Assign", "Attach a price list to a customer so they see those prices. (Promotions aren't assigned — they're global.)"],
  ["Preview impact", "In the Assign box: shows which products change price for the chosen customers before you commit."],
  ["Check for cost changes", "Compare a saved list to the latest published costs and review what moved."],
  ["Cost band", "A cost range with its own margin, for bulk pricing."],
  ["Smart pricing", "Optional tidy price endings (.49/.99 or nearest .x9) applied when a list is built. Fixed prices are never changed."],
  ["Price on request", "A product with no cost shown to customers without a price; they request a quote instead of buying directly. Never sold at £0."],
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
            How a supplier cost becomes the price a customer sees — the daily routine, what we
            charge, negotiated deals, and getting customers signed in.
          </p>
          <div className="mt-3 flex items-start gap-2 text-sm rounded-md bg-emerald-100/70 dark:bg-emerald-900/30 p-3">
            <Lightbulb className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
            <span><b>The golden rule:</b> customers only ever see their final selling price. Never your cost, your margin, or anyone else's list.</span>
          </div>
        </div>

        {/* ---- 1. THE PATH A COST TAKES ---------------------------------- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where a price comes from</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Three systems, and a cost has to cross all of them before anyone can buy at it. The
              part that catches everyone is the <b>dotted line</b>: publishing a cost does not reach
              a customer by itself.
            </p>

            <div className="rounded-md border bg-card p-4 overflow-x-auto">
              <svg
                viewBox="0 0 900 372"
                role="img"
                aria-label="A supplier cost travels from Price Manager through sync, draft and publish to become a live buying price, then crosses a deliberate gap into a price list where a rate card turns it into a customer price."
                className="w-full h-auto text-foreground"
                style={{ minWidth: 560 }}
              >
                <defs>
                  <marker id="pgA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <polygon points="0,1 10,5 0,9" fill="currentColor" />
                  </marker>
                  <marker id="pgB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <polygon points="0,1 10,5 0,9" fill="#1f9c6e" />
                  </marker>
                </defs>

                <text x="10" y="26" fontSize="11" fill="currentColor" opacity="0.55" letterSpacing="1">OUTSIDE THE PORTAL</text>
                <text x="10" y="150" fontSize="11" fill="currentColor" opacity="0.55" letterSpacing="1">INSIDE THE PORTAL</text>
                <line x1="0" y1="118" x2="900" y2="118" stroke="currentColor" strokeWidth="1" opacity="0.18" />

                <rect x="10" y="44" width="176" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="98" y="68" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">Price Manager</text>
                <text x="98" y="85" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.65">RD &amp; team enter costs</text>

                <rect x="330" y="44" width="176" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="418" y="68" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">Inventory app</text>
                <text x="418" y="85" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.65">products &amp; customers</text>

                <line x1="186" y1="70" x2="322" y2="70" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgA)" opacity="0.5" />
                <text x="254" y="62" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.7">matched by barcode</text>

                <line x1="98" y1="96" x2="98" y2="164" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgA)" />
                <text x="106" y="134" fontSize="10.5" fill="currentColor" opacity="0.75">Sync now</text>

                <rect x="10" y="168" width="150" height="50" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="85" y="190" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Draft cost</text>
                <text x="85" y="206" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">nothing live yet</text>

                <line x1="160" y1="193" x2="204" y2="193" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgA)" />
                <text x="182" y="184" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.75">publish</text>

                <rect x="210" y="168" width="150" height="50" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="285" y="190" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Live buying price</text>
                <text x="285" y="206" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">what we pay</text>

                <g className="text-emerald-600 dark:text-emerald-400">
                  <line x1="360" y1="193" x2="470" y2="193" stroke="currentColor" strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#pgB)" />
                  <text x="415" y="181" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">daily run</text>
                  <text x="415" y="215" textAnchor="middle" fontSize="10.5" fill="currentColor">does not cross by itself</text>
                </g>

                <rect x="476" y="160" width="182" height="66" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="567" y="182" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Price list</text>
                <text x="567" y="198" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">one per brand, per rate</text>
                <text x="567" y="214" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">holds a copy of the cost</text>

                <line x1="658" y1="193" x2="712" y2="193" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgA)" />
                <text x="685" y="184" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.75">assigned</text>

                <rect x="718" y="168" width="172" height="50" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="804" y="190" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Customer sees a price</text>
                <text x="804" y="206" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">signed in on the portal</text>

                <g className="text-emerald-600 dark:text-emerald-400">
                  <rect x="476" y="278" width="182" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <text x="567" y="300" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Rate card</text>
                  <text x="567" y="316" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.85">Standard 20%</text>
                  <line x1="567" y1="278" x2="567" y2="232" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgB)" />
                  <text x="577" y="258" fontSize="10.5" fill="currentColor">sets the margin</text>
                </g>

                <line x1="418" y1="96" x2="418" y2="126" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
                <line x1="418" y1="126" x2="804" y2="126" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
                <line x1="804" y1="126" x2="804" y2="160" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgA)" opacity="0.45" />
                <text x="700" y="118" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.7">customer record → login invite</text>
              </svg>
            </div>

            <div className="flex items-start gap-2 text-sm rounded-md bg-muted/50 p-3">
              <Lightbulb className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              <span>
                <b>The gap is deliberate.</b> A price list keeps its own copy of the cost so a
                customer's price can't move while someone is mid-edit upstream. The trade-off is that
                something has to carry the new cost across — that is the daily run, and it's the one
                step that's easy to forget.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ---- 2. EVERY MORNING ------------------------------------------- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-emerald-600" /> Every morning — the daily run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              One page, top to bottom. If nothing changed overnight it says so and you close it.
            </p>
            <ol className="text-sm space-y-3">
              <li>
                <b>1. Fetch what changed.</b> Brings in whatever was entered in Price Manager since
                last time. Creates drafts only — no customer price can move, so it is always safe.
                <Link href="/admin/pm-sync"><span className="block text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer mt-0.5">3b. Sync from Price Manager → Sync now</span></Link>
              </li>
              <li>
                <b>2. Publish the new costs.</b> Turns drafts into our live buying price. Still no
                customer price moves.
              </li>
              <li>
                <b>3. Look at what it will do.</b> How many prices move, up and down, what's new, and
                every cost that jumped more than 25% with both figures. That last list is the reason
                to look — a supplier typo becomes your selling price otherwise.
              </li>
              <li>
                <b>4. Send it to customers.</b> One press. Recalculates at each list's own margin,
                adds products the supplier has started carrying, and leaves any price you typed by
                hand exactly where it is.
                <Link href="/admin/bulk-setup"><span className="block text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer mt-0.5">Open Daily price run</span></Link>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* ---- 3. WHAT WE CHARGE ------------------------------------------ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-emerald-600" /> What we charge, and changing it
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A <b>rate card</b> is one commercial decision, written down once — the price lists are
              built from it. Every customer sits on exactly one card. That's the difference between
              changing your margin in one press and changing it in fifty-eight.
            </p>
            <ul className="text-sm space-y-1.5 list-disc pl-4">
              <li><b>Change what everybody pays:</b> Rates → press <b>Change</b> on the card → new number → Apply.</li>
              <li><b>A customer who's generally cheaper:</b> create a card (<i>Key account, 15%</i>), then tick them and Move.</li>
              <li><b>One brand you shook hands on:</b> add an exception — customer, brand, margin.</li>
            </ul>

            <div className="rounded-md border bg-card p-4 overflow-x-auto">
              <svg
                viewBox="0 0 760 244"
                role="img"
                aria-label="Deciding a customer's price for a brand: an exception for that customer and brand wins if one exists, otherwise their rate card decides."
                className="w-full h-auto text-foreground"
                style={{ minWidth: 520 }}
              >
                <defs>
                  <marker id="pgC" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <polygon points="0,1 10,5 0,9" fill="currentColor" />
                  </marker>
                </defs>

                <rect x="10" y="94" width="184" height="56" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="102" y="118" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">A customer wants a brand</text>
                <text x="102" y="135" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">which price do they get?</text>

                <line x1="194" y1="122" x2="248" y2="122" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgC)" />

                <path d="M 258 122 L 340 78 L 422 122 L 340 166 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="340" y="116" textAnchor="middle" fontSize="11.5" fill="currentColor">a deal on</text>
                <text x="340" y="131" textAnchor="middle" fontSize="11.5" fill="currentColor">this brand?</text>

                <line x1="340" y1="78" x2="340" y2="46" stroke="currentColor" strokeWidth="1.4" />
                <line x1="340" y1="46" x2="544" y2="46" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgC)" />
                <text x="352" y="66" fontSize="11" fill="currentColor" opacity="0.8">yes</text>

                <g className="text-emerald-600 dark:text-emerald-400">
                  <rect x="552" y="22" width="198" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <text x="651" y="44" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">The deal — 12%</text>
                  <text x="651" y="60" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.85">its own one-customer list</text>
                </g>

                <line x1="340" y1="166" x2="340" y2="198" stroke="currentColor" strokeWidth="1.4" />
                <line x1="340" y1="198" x2="544" y2="198" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgC)" />
                <text x="352" y="190" fontSize="11" fill="currentColor" opacity="0.8">no</text>

                <rect x="552" y="174" width="198" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="651" y="196" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Their rate card — 20%</text>
                <text x="651" y="212" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">the same list everyone gets</text>
              </svg>
            </div>

            <div className="flex items-start gap-2 text-sm rounded-md bg-muted/50 p-3">
              <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              <span>
                <b>The exception is checked first, every time.</b> So a house-wide rate change cannot
                reach it — put Standard up to 25% and a customer on 12% for one brand stays at 12%.
                That's why a deal belongs here rather than as a hand-edited price list.
              </span>
            </div>

            <Link href="/admin/rates">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1">
                Open Rates <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </CardContent>
        </Card>

        {/* ---- 3b. EXACTLY WHAT TO PRESS ---------------------------------- */}
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" /> Changing a price — exactly what to press
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Four jobs, from "everybody" down to "this one line". Pick the smallest one that does
              what you need &mdash; the bigger the change, the more customers feel it.
            </p>

            {/* A */}
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-600">A</Badge>
                <span className="font-semibold text-sm">Change the % everybody pays</span>
                <span className="text-xs text-muted-foreground">e.g. 20% &rarr; 22% for all 28 customers</span>
              </div>
              <ol className="text-sm space-y-1.5 list-decimal pl-5 text-muted-foreground">
                <li>Go to <b>Customer Pricing &rarr; Rates &mdash; what we charge</b>.</li>
                <li>In <b>What we charge</b>, find the row <b>Standard</b> with the <i>house rate</i> badge. Its % is on the right.</li>
                <li>Press <b>Change</b> next to it. The % turns into a box.</li>
                <li>Clear it, type <b>22</b>, press <b>Apply</b>.</li>
                <li>You'll get "<i>4,547 price(s) changed &mdash; across 58 list(s)</i>". That's it &mdash; live.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                A £10 cost now sells at £12.20 instead of £12.00. Negotiated brands (C below) do not move.
              </p>
            </div>

            {/* B */}
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-600">B</Badge>
                <span className="font-semibold text-sm">Give one customer a different % on everything</span>
                <span className="text-xs text-muted-foreground">a bigger account on 15% across all brands</span>
              </div>
              <ol className="text-sm space-y-1.5 list-decimal pl-5 text-muted-foreground">
                <li>On <b>Rates</b>, go to the bottom of the first card: <b>New rate card</b>.</li>
                <li>Type a name &mdash; <b>Key account</b>. In <b>Margin %</b> type <b>15</b>.</li>
                <li>Press <b>Create and build its 58 brand lists</b>. Give it a few seconds; it builds one list per brand at 15%.</li>
                <li>Scroll to <b>Put customers on a rate</b>. Search their name and tick the box.</li>
                <li>In <b>Move to which rate?</b> choose <b>Key account &mdash; 15%</b>, then press <b>Move</b>.</li>
                <li>The card now reads <i>Key account &mdash; 1 customer &mdash; 58 brand lists</i>.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Do this once. The next customer who negotiates the same deal just gets ticked and Moved &mdash; no rebuilding.
              </p>
            </div>

            {/* C */}
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-600">C</Badge>
                <span className="font-semibold text-sm">Give one customer their own price on one brand</span>
                <span className="text-xs text-muted-foreground">the handshake deal &mdash; their own price list for that brand</span>
              </div>
              <ol className="text-sm space-y-1.5 list-decimal pl-5 text-muted-foreground">
                <li>On <b>Rates</b>, scroll to <b>Negotiated brands</b> (the last card).</li>
                <li><b>Customer</b> &mdash; pick them from the list.</li>
                <li><b>Brand</b> &mdash; pick the brand.</li>
                <li><b>Margin %</b> &mdash; type their rate, e.g. <b>12</b>.</li>
                <li><b>Note</b> &mdash; why, e.g. "agreed Sept, review in 6 months". This is the bit you'll want later.</li>
                <li>Press <b>Save this rate</b>.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                It appears as <i>ICANLO &middot; BALEGA &middot; 12% instead of 20% (Standard)</i>. Behind the scenes it builds
                a price list for that brand used by that one customer &mdash; that <b>is</b> the customer-specific price list.
                To end it, press the <b>&times;</b> and they go back to 20% on that brand.
              </p>
            </div>

            {/* D */}
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge variant="secondary">D</Badge>
                <span className="font-semibold text-sm">Set one single product to an exact price</span>
                <span className="text-xs text-muted-foreground">when the % doesn't work for one line</span>
              </div>
              <ol className="text-sm space-y-1.5 list-decimal pl-5 text-muted-foreground">
                <li>Go to <b>5. Price Lists</b> and open the brand's list on the left.</li>
                <li>Find the line &mdash; search by barcode or name.</li>
                <li>In <b>Pricing method</b> change <b>Margin %</b> to <b>Fixed £</b>.</li>
                <li>Type the exact selling price.</li>
                <li>Press <b>Save</b>.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                A Fixed £ line is yours from then on: the daily run and a rate change both leave it alone
                and report it rather than recalculating it. Switch it back to <b>Margin %</b> to hand it back to the rate card.
              </p>
            </div>

            <div className="flex items-start gap-2 text-sm rounded-md bg-muted/50 p-3">
              <Lightbulb className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              <span>
                <b>Which one?</b> Everyone &rarr; <b>A</b>. One customer, all brands &rarr; <b>B</b>.
                One customer, one brand &rarr; <b>C</b>. One product &rarr; <b>D</b>.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ---- 4. GETTING CUSTOMERS IN ------------------------------------ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600" /> Getting customers into the portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Approval stays in the inventory app — the portal never approves anyone twice, it reads
              who is already approved and gives them a login. <b>No password is ever emailed:</b> they
              get a link, valid 7 days, and set their own.
            </p>

            <div className="rounded-md border bg-card p-4 overflow-x-auto">
              <svg
                viewBox="0 0 860 210"
                role="img"
                aria-label="An approved customer is invited, receives a link, sets a password and signs in; the invite list shows which of those states each customer is in."
                className="w-full h-auto text-foreground"
                style={{ minWidth: 560 }}
              >
                <defs>
                  <marker id="pgD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <polygon points="0,1 10,5 0,9" fill="currentColor" />
                  </marker>
                </defs>

                <rect x="8" y="40" width="150" height="54" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="83" y="63" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Approved</text>
                <text x="83" y="79" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">in the inventory app</text>

                <line x1="158" y1="67" x2="202" y2="67" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgD)" />
                <text x="180" y="58" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.75">tick</text>

                <rect x="208" y="40" width="150" height="54" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="283" y="63" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Invited</text>
                <text x="283" y="79" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">email sent, link live</text>

                <line x1="358" y1="67" x2="402" y2="67" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgD)" />
                <text x="380" y="58" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.75">they click</text>

                <rect x="408" y="40" width="150" height="54" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <text x="483" y="63" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Sets a password</text>
                <text x="483" y="79" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.65">their own, never ours</text>

                <line x1="558" y1="67" x2="602" y2="67" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#pgD)" />

                <g className="text-emerald-600 dark:text-emerald-400">
                  <rect x="608" y="40" width="150" height="54" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <text x="683" y="63" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">Signed in</text>
                  <text x="683" y="79" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.85">sees their prices</text>
                </g>

                <line x1="283" y1="94" x2="283" y2="130" stroke="currentColor" strokeWidth="1" opacity="0.35" />
                <line x1="683" y1="94" x2="683" y2="130" stroke="currentColor" strokeWidth="1" opacity="0.35" />

                <text x="283" y="148" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.8">invited, waiting</text>
                <text x="683" y="148" textAnchor="middle" fontSize="11" fill="currentColor" className="text-emerald-600 dark:text-emerald-400">signed in + date</text>

                <text x="283" y="172" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.6">→ after 7 days: link expired</text>
                <text x="683" y="172" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.6">most recent sign-in</text>

                <line x1="8" y1="192" x2="852" y2="192" stroke="currentColor" strokeWidth="1" opacity="0.18" />
                <text x="8" y="207" fontSize="10.5" fill="currentColor" opacity="0.6">what the invite list shows you</text>
              </svg>
            </div>

            <ul className="text-sm space-y-1.5 list-disc pl-4">
              <li><b>Send a batch:</b> Customer Logins → <i>Select next 10</i> → Send. Ten is a shortcut, not a limit — tick five or fifteen by hand if you prefer.</li>
              <li><b>Test records</b> are marked and never picked for you.</li>
              <li><b>Did they take it up?</b> The bottom of that page shows each login as <i>signed in</i> with the date, <i>invited, waiting</i>, or <i>link expired</i>, with a <b>Send again</b> button beside the last two.</li>
              <li><b>New accounts see prices immediately</b> — each one is put on the house rate as it's created.</li>
            </ul>

            <div className="flex items-start gap-2 text-sm rounded-md bg-amber-50 dark:bg-amber-950/20 p-3">
              <CircleAlert className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <span>
                Two things block an invite, and both are fixed in the inventory app, not here:
                <b> no email address</b> on the customer record, and <b>the same email on two
                customers</b> — one address cannot be two logins.
              </span>
            </div>

            <Link href="/admin/customer-sync">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1">
                Open Customer Logins <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </CardContent>
        </Card>

        <div className="pt-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Screen by screen</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            What each page in this section is for. You don't redo these every day — the daily run
            above covers the routine.
          </p>
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
              Steps 1–4 get your <b>costs</b> in. Step 5 turns costs into <b>selling prices</b> (by brand or category). Step 6 shows <b>who gets them</b>. Step 7 runs <b>limited-time promotions</b>.
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
            <p className="text-xs text-muted-foreground mt-2">For a quick one-off fix instead of a full upload, use <b>Current Costs</b>. Running this month's deals? Set them up in <b>Promotions</b> with a start &amp; end date — they go live and expire on their own.</p>
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
