import type { State } from './api';
import { api } from './api';
export function Sidebar({ state, onChange, onOpenContext }: {
    state: State;
    onChange: () => void;
    onOpenContext: () => void;
}) {
    return <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6"><h1 className="text-lg font-semibold">ClaudeCodex Public</h1><p className="text-sm text-[var(--muted)]">Explore the real frontend with a limited browser demo adapter. Nothing connects to a private server.</p><section><h2 className="font-semibold">Workspace</h2><p className="my-3 text-sm">{state.project || 'No demo workspace selected'}</p><button className="rounded bg-[var(--raised)] p-3" onClick={async () => { await api.setProject(); onChange(); }}>Use demo workspace</button></section><section><h2 className="font-semibold">Workflow</h2><p className="mt-2 text-sm text-[var(--muted)]">Build creates a canned sample relay. Review its diff, then Apply or Undo in memory. Ask records a note; it does not produce an AI answer.</p></section><button className="rounded bg-[var(--raised)] p-3" onClick={onOpenContext}>Edit demo context</button><button className="rounded p-3 ring-1 ring-[var(--line)]" onClick={() => { api.reset(); onChange(); }}>Reset demo</button><p className="mt-auto text-xs text-[var(--muted)]">Reload clears all demo notes. Local panel widths are remembered. No file picker, command runner, API key or model service is included.</p></div>;
}
