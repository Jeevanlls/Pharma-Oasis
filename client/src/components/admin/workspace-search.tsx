import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowUpRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { adminSections } from "@/lib/admin-navigation";
import type { WorkspaceSearchResult } from "@shared/admin-workspace";

export function WorkspaceSearch() {
  const [path] = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => { setOpen(false); setQuery(""); }, [path]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); input.current?.focus(); setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, []);
  const result = useQuery<WorkspaceSearchResult[]>({
    queryKey: ["/api/admin/workspace/search", debounced],
    queryFn: async () => (await apiRequest("GET", `/api/admin/workspace/search?q=${encodeURIComponent(debounced)}`)).json(),
    enabled: open && debounced.length >= 3,
    staleTime: 30_000,
  });
  const tools = debounced.length >= 3 ? adminSections.flatMap(s => s.links)
    .filter(link => link.label.toLowerCase().includes(debounced.toLowerCase())).slice(0, 4) : [];
  const pending = query.trim() !== debounced || result.isFetching;
  return <div className="aw-search" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <Search size={18} />
    <input ref={input} type="search" aria-label="Search the workspace" maxLength={80}
      placeholder="Search accounts, products, EANs…" value={query}
      aria-expanded={open} aria-controls="aw-search-results"
      onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} />
    <kbd>⌘ K</kbd>
    {open && <div id="aw-search-results" className="aw-search-results">
      {query.trim().length < 3 ? <p>Type at least 3 letters or digits.</p> : pending ? <p role="status"><Loader2 className="animate-spin" size={16} /> Searching…</p> : <>
        {result.isError && <p role="alert">Search could not load. Try again, or use the sections below.</p>}
        {tools.length > 0 && <h3>Workspace tools</h3>}
        {tools.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={15} /></Link>)}
        {(result.data ?? []).map(item => <Link key={`${item.kind}-${item.id}`} href={item.href} onClick={() => setOpen(false)}>
          <span><strong>{item.label}</strong><small>{item.kind} · {item.detail}</small></span><ArrowUpRight size={15} />
        </Link>)}
        {!result.isError && !tools.length && !result.data?.length && <p>No matching records.</p>}
      </>}
    </div>}
  </div>;
}
