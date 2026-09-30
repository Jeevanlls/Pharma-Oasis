import { Link } from "wouter";
import { FileText, ShoppingBag, Users, Package, Plus, ArrowRight, ArrowUpRight, Clock3, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWorkspaceAccounts, useWorkspaceSales, workspaceDate, workspaceMoney } from "@/lib/admin-workspace";
import { WorkspaceStatus, WorkspaceError } from "@/components/admin/workspace-status";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { users, suppliers } = useWorkspaceAccounts();
  const { quotes, orders, orderStats, stats } = useWorkspaceSales();
  const allQueries = [users, suppliers, quotes, orders, orderStats, stats];
  const failed = allQueries.some(query => query.isError);
  const customerName = (id: number) => {
    const customer = users.data?.find(customer => customer.id === id);
    return customer?.companyName || customer?.email || `Customer #${id}`;
  };
  const pendingCustomers = (users.data ?? []).filter(customer => customer.role === "customer" && customer.status === "pending");
  const pendingSuppliers = (suppliers.data ?? []).filter(supplier => supplier.status === "new");
  const pendingQuotes = (quotes.data ?? []).filter(quote => quote.status === "pending");
  const applications = users.data && suppliers.data && !users.isError && !suppliers.isError ? pendingCustomers.length + pendingSuppliers.length : undefined;
  const recent = [
    ...(quotes.data ?? []).filter(quote => ["pending", "quoted"].includes(quote.status)).map(quote => ({
      key: `quote-${quote.id}`, href: `/admin/sales/quote/${quote.id}`, ref: `Q-${quote.id}`, name: customerName(quote.userId),
      status: quote.status, label: quote.status === "pending" ? "To price" : "Quote sent", date: quote.createdAt,
      value: quote.status === "pending" ? null : quote.totalEstimate,
    })),
    ...(orders.data ?? []).map(order => ({
      key: `order-${order.id}`, href: `/admin/sales/order/${order.id}`, ref: `O-${order.id}`,
      name: order.companyName || order.email || customerName(order.userId), status: order.status,
      label: undefined, date: order.createdAt, value: order.totalAmount,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  const worklistLoading = quotes.isLoading || orders.isLoading || users.isLoading;
  const worklistError = quotes.isError || orders.isError || users.isError;
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });
  const name = (user?.primaryContactName || "there").split(" ")[0];
  const metrics = [
    { label: "Quotations to prepare", value: quotes.isError ? undefined : quotes.data ? pendingQuotes.length : undefined, detail: "Your team's next conversations", href: "/admin/sales", icon: FileText },
    { label: "Orders in progress", value: orderStats.isError ? undefined : orderStats.data?.activeTotal, detail: "Active website worklist", href: "/admin/sales", icon: ShoppingBag },
    { label: "Applications to review", value: applications, detail: "Customers & supplier partners", href: "/admin/accounts?view=review", icon: Users },
    { label: "Products in catalogue", value: stats.isError ? undefined : stats.data?.totalProducts, detail: "Manage the website range", href: "/admin/products", icon: Package },
  ];
  const attention = [
    ...pendingQuotes.slice(0, 2).map(quote => ({ key: `q-${quote.id}`, title: customerName(quote.userId), detail: `Pricing needed · Q-${quote.id}`, href: `/admin/sales/quote/${quote.id}`, icon: Clock3 })),
    ...pendingCustomers.slice(0, 2).map(customer => ({ key: `c-${customer.id}`, title: customer.companyName || customer.email, detail: "Customer application", href: `/admin/users?review=${customer.id}`, icon: Users })),
    ...pendingSuppliers.slice(0, 2).map(supplier => ({ key: `s-${supplier.id}`, title: supplier.companyName, detail: "Supplier application", href: `/admin/suppliers?review=${supplier.id}`, icon: Users })),
  ];
  return <>
    <div className="aw-heading"><div><span className="aw-eyebrow">{date}</span><h1>Welcome back, {name}<span>.</span></h1><p>Your working day, in focus.</p></div><Link className="aw-action primary" href="/admin/sales/new-quote"><Plus size={17} />New quotation</Link></div>
    {failed && <WorkspaceError retry={() => allQueries.forEach(query => { void query.refetch(); })} />}
    <div className="aw-metrics">{metrics.map(metric => <Link key={metric.label} href={metric.href} className="aw-metric"><span>{metric.label}<metric.icon size={18} /></span><strong>{metric.value == null ? "—" : metric.value.toLocaleString("en-GB", { minimumIntegerDigits: 2 })}</strong><small>{metric.detail}</small></Link>)}</div>
    <div className="aw-grid">
      <section className="aw-panel"><div className="aw-panel-head"><div><span className="aw-eyebrow">Your sales desk</span><h2>Keep the conversation moving.</h2></div><Link href="/admin/sales">View all <ArrowRight size={16} /></Link></div>
        {worklistLoading ? <p className="aw-feedback" role="status">Loading your sales worklist…</p> : <div className="aw-table-wrap"><table className="aw-table"><thead><tr><th>Enquiry / customer</th><th>Status</th><th className="text-right">Value</th><th><span className="sr-only">Open request</span></th></tr></thead><tbody>{recent.map(row => <tr key={row.key}><td><Link href={row.href}><strong>{row.name}</strong><small>{row.ref} · {workspaceDate(row.date)}</small></Link></td><td><WorkspaceStatus value={row.status} label={row.label} /></td><td className="text-right whitespace-nowrap">{workspaceMoney(row.value)}</td><td><Link href={row.href} aria-label={`Open ${row.ref}`}><ArrowUpRight size={18} /></Link></td></tr>)}{!recent.length && !worklistError && <tr><td colSpan={4} className="aw-feedback">No active requests. New enquiries will appear here.</td></tr>}</tbody></table></div>}
        <div className="aw-panel-foot"><span>EANs stay with every request.</span><Link href="/admin/sales">Open sales desk →</Link></div>
      </section>
      <aside className="aw-panel aw-attention"><div className="aw-panel-head"><div><span className="aw-eyebrow">A little focus</span><h2>Needs attention</h2></div></div><div className="aw-attention-list">{attention.map(item => <Link key={item.key} href={item.href}><item.icon size={18} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={15} /></Link>)}{!attention.length && <p className="aw-feedback">{allQueries.some(query => query.isLoading) ? "Checking requests…" : failed ? "Some worklists could not load." : "No pending quotations or new applications."}</p>}</div><div className="aw-attention-note"><span>✳</span><p>Good relationships.<br />Thoughtful follow-through.</p></div></aside>
    </div>
    <div className="aw-lower-grid"><section className="aw-panel aw-brand-panel"><span className="aw-eyebrow">The weekly edit</span><h2>Your brands. Their next opportunity.</h2><p>Build your next promotion around the brands your customers need.</p><Link href="/admin/offers">Manage weekly offers <ArrowRight size={16} /></Link></section><section className="aw-panel"><div className="aw-panel-head"><div><span className="aw-eyebrow">Connected work</span><h2>A clear view of each handoff.</h2></div></div><div className="aw-shortcuts"><Link href="/admin/website-requests">Website requests & inventory handoff <ArrowUpRight size={16} /></Link><Link href="/admin/pm-sync">Price Manager synchronisation <ArrowUpRight size={16} /></Link><Link href="/admin/customer-sync">Customer logins & invitations <ArrowUpRight size={16} /></Link></div></section></div>
  </>;
}
