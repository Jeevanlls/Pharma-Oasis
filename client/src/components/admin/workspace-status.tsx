import { workspaceLabels } from "@/lib/admin-workspace";

export function WorkspaceStatus({ value, label }: { value: string; label?: string }) {
  return <span className={`aw-status ${value}`}><i />{label || workspaceLabels[value] || value}</span>;
}

export function WorkspaceError({ retry, message = "Some records could not load. Please try again." }: { retry: () => void; message?: string }) {
  return <div className="aw-error" role="alert"><span>{message}</span><button onClick={retry}>Try again</button></div>;
}
