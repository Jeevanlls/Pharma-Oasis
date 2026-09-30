export interface WorkspaceSearchResult {
  kind: "Product" | "Customer" | "Supplier" | "Quote" | "Order";
  id: number;
  label: string;
  detail: string;
  href: string;
}

export function workspaceSearchTerm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const term = value.trim();
  return term.length >= 3 && term.length <= 80 ? term : null;
}

/** Treat search characters literally, including %, _ and backslash. */
export function workspaceLike(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}
