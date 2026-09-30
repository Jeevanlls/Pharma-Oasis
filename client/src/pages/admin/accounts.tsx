import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowUpRight, Search, Users } from "lucide-react";
import { useWorkspaceAccounts } from "@/lib/admin-workspace";
import { WorkspaceError, WorkspaceStatus } from "@/components/admin/workspace-status";

export default function AdminAccounts() {
  const { users, suppliers } = useWorkspaceAccounts();
  const params = useSearch();
  const [view, setView] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setView(new URLSearchParams(params).get("view") === "review" ? "Needs review" : "All"); }, [params]);
  useEffect(() => { setPage(1); }, [view, search]);
  const rows = useMemo(() => [
    ...(users.data ?? []).filter(user => user.role === "customer").map(user => ({
      id: user.id, kind: "Customer", name: user.companyName || user.email,
      contact: user.primaryContactName || "—", email: user.email,
      country: user.billingCountry || "—", status: user.status,
      review: user.status === "pending", href: `/admin/users?review=${user.id}`,
    })),
    ...(suppliers.data ?? []).map(supplier => ({
      id: supplier.id, kind: "Supplier", name: supplier.companyName,
      contact: supplier.contactName, email: supplier.email, country: supplier.country,
      status: supplier.status, review: supplier.status === "new", href: `/admin/suppliers?review=${supplier.id}`,
    })),
  ].sort((a, b) => Number(b.review) - Number(a.review) || a.name.localeCompare(b.name)), [users.data, suppliers.data]);
  const filtered = rows.filter(row => (view === "All" || view === "Needs review" && row.review || view === "Customers" && row.kind === "Customer" || view === "Suppliers" && row.kind === "Supplier") &&
    `${row.name} ${row.contact} ${row.email} ${row.country}`.toLowerCase().includes(search.trim().toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 30));
  const currentPage = Math.min(page, totalPages);
  const loading = users.isLoading || suppliers.isLoading;
  const error = users.isError || suppliers.isError;
  return <>
    <div className="aw-heading"><div><span className="aw-eyebrow">Pharma Oasis / Relationships</span><h1>Accounts</h1><p>Customers, supplier applications and the people behind them.</p></div><Link className="aw-action" href="/admin/customer-sync"><Users size={17} />Customer logins</Link></div>
    {error && <WorkspaceError retry={() => { void users.refetch(); void suppliers.refetch(); }} />}
    <section className="aw-panel">
      <div className="aw-panel-head"><div><h2>People behind the business</h2><p>Open a record to review its full application and existing account actions.</p></div></div>
      <div className="aw-account-filters"><div className="aw-account-tabs" role="group" aria-label="Relationship filters">{["All", "Customers", "Suppliers", "Needs review"].map(label => <button key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</div>
        <label className="aw-account-search"><Search size={16} /><input type="search" aria-label="Search accounts" placeholder="Company, contact, email or country" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {loading ? <p className="aw-feedback" role="status">Loading relationships…</p> : <div className="aw-table-wrap"><table className="aw-table aw-account-table"><thead><tr><th>Company / contact</th><th>Relationship</th><th>Country</th><th>Status</th><th><span className="sr-only">Open account</span></th></tr></thead><tbody>
        {filtered.slice((currentPage - 1) * 30, currentPage * 30).map(row => <tr key={`${row.kind}-${row.id}`}><td><Link className="aw-account-link" href={row.href}><span className="aw-company-avatar">{row.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span><span><strong>{row.name}</strong><small>{row.contact}</small></span></Link></td><td>{row.kind}</td><td>{row.country}</td><td><WorkspaceStatus value={row.status} /></td><td><Link href={row.href} aria-label={`Review ${row.name}`}><ArrowUpRight size={18} /></Link></td></tr>)}
        {!filtered.length && !error && <tr><td colSpan={5} className="aw-feedback">No accounts match this view.</td></tr>}
      </tbody></table></div>}
      <div className="aw-panel-foot"><span>{loading ? "Loading…" : `${filtered.length.toLocaleString("en-GB")} relationships${error ? " · incomplete while records are unavailable" : ""}`} · Supplier applications do not create logins.</span>
        {totalPages > 1 && <div className="flex items-center gap-3"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button></div>}
      </div>
    </section>
  </>;
}
