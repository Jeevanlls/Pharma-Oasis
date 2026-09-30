import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, FileText, Users, Package, SlidersHorizontal, Megaphone, Settings2, Menu, ArrowUpRight, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { adminSections, adminSectionFor, routeIsActive } from "@/lib/admin-navigation";
import { WorkspaceSearch } from "@/components/admin/workspace-search";
import "@/styles/admin-workspace.css";

const icons = [LayoutGrid, FileText, Users, Package, SlidersHorizontal, Megaphone, Settings2];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const section = adminSectionFor(path);
  const name = user?.primaryContactName || user?.companyName || "Administrator";
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  useEffect(() => {
    document.body.classList.add("aw-active");
    return () => document.body.classList.remove("aw-active");
  }, []);
  useEffect(() => { setMobileOpen(false); document.title = `${section.label} · Pharma Oasis workspace`; }, [path, section.label]);
  const navigation = <>
    <Link href="/admin" className="aw-logo"><img src="/brand/wordmark.svg" alt="Pharma Oasis" /><span>THE WORKSPACE <i>°</i></span></Link>
    <div className="aw-business"><span>PO</span><div>Pharma Oasis<small>Wholesale operations</small></div><ShieldCheck size={17} /></div>
    <span className="aw-nav-caption">WORKSPACE</span>
    <nav aria-label="Workspace sections">{adminSections.map((item, index) => {
      const Icon = icons[index];
      return <Link href={item.href} key={item.key} className={section.key === item.key ? "active" : ""} aria-current={section.key === item.key ? "page" : undefined}><Icon size={19} /><span>{item.label}</span></Link>;
    })}</nav>
    <div className="aw-sidebar-bottom">
      <Link href="/" className="aw-website">View website <ArrowUpRight size={17} /></Link>
      <div className="aw-user"><span className="aw-avatar">{initials}</span><div>{name}<small>Administrator</small></div></div>
      <button className="aw-signout" onClick={() => { void logout(); }}><LogOut size={16} />Sign out</button>
    </div>
  </>;
  return <div className="aw-root">
    <a href="#aw-main" className="aw-skip">Skip to workspace</a>
    <aside className="aw-sidebar">{navigation}</aside>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="aw-mobile-sidebar">
        <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
        <SheetDescription className="sr-only">Choose a workspace section.</SheetDescription>
        {navigation}
      </SheetContent>
    </Sheet>
    <div className="aw-workspace">
      <header className="aw-topbar">
        <button className="aw-menu" aria-label="Open workspace navigation" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
        <div className="aw-breadcrumb">Workspace<ChevronRight size={14} /><strong>{section.label}</strong></div>
        <WorkspaceSearch />
        <Link href="/admin/accounts?view=review" className="aw-inbox" aria-label="Review account applications"><Users size={20} /></Link>
        <span className="aw-avatar aw-top-avatar" title={name}>{initials}</span>
      </header>
      <nav className="aw-section-nav" aria-label={`${section.label} tools`}>
        {section.links.map(item => <Link key={item.href} href={item.href} className={routeIsActive(path, item.href) ? "active" : ""} aria-current={routeIsActive(path, item.href) ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <main id="aw-main" className="aw-main" tabIndex={-1}>{children}</main>
      <footer className="aw-footer"><span>PHARMA OASIS ° THE WORKSPACE</span><span>A focused place to work.</span></footer>
    </div>
  </div>;
}
