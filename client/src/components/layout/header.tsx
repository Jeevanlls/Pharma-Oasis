import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag, X } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { useAuth } from "@/lib/auth";
import { useBasket } from "@/lib/basket";
const links = [
  ["/products", "Product catalogue"],
  ["/offers", "The weekly edit"],
  ["/oasisbiome", "Oasisbiome"],
  ["/about", "Our world"],
];
export function Header() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount, lines } = useBasket();
  useEffect(() => {
    setOpen(false);
  }, [location]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className={`header ${open ? "menu-open" : ""}`}>
      <Link
        href="/"
        aria-label="Pharma Oasis home"
        data-testid="link-home-logo"
      >
        <BrandWordmark />
      </Link>
      <nav id="primary-navigation" aria-label="Main navigation">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={location === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        {open && (
          <div className="mobile-account-links">
            <Link href="/products">Product catalogue</Link>
            <Link href="/contact">Contact the team</Link>
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">My account</Link>
                <Link href="/my-quotes">My quotes</Link>
                {isAdmin && <Link href="/admin">Admin panel</Link>}
                <button onClick={() => void logout()}>Sign out</button>
              </>
            ) : (
              <Link href="/register">Become a trade partner</Link>
            )}
          </div>
        )}
      </nav>
      <div className="header-actions">
        {isAuthenticated && (
          <Link
            href={lines.some(l=>l.kind==="portal") ? "/basket" : "/portal/quote"}
            className="po-basket-link"
            aria-label={`Basket, ${itemCount} units`}
          >
            <ShoppingBag size={19} />
            {itemCount > 0 && <span>{itemCount > 99 ? "99+" : itemCount}</span>}
          </Link>
        )}
        <Link
          href="/portal"
          className="login"
          data-testid="button-customer-portal"
        >
          Your trade space
        </Link>
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-controls="primary-navigation"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
