import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelLeft, PanelRight, X, Download } from 'lucide-react';
import { AgentId, api, AGENT_COLOR, Stage, State, Task } from './api';
import { Sidebar } from './Sidebar';
import { Chat } from './Chat';
import { Activity } from './Activity';
import { Relay, Station } from './Relay';
export default function App() {
    const [state, setState] = useState<State | null>(null);
    const [offline, setOffline] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
    const [contextOpen, setContextOpen] = useState(false);
    const container = useRef<HTMLDivElement>(null);
    const [panels, setPanels] = useState(() => {
        try {
            const value = JSON.parse(localStorage.getItem('cc-panel-layout') || '{}');
            return { left: Number.isFinite(value.left) ? Math.max(0, Math.min(700, value.left)) : 288,
                right: Number.isFinite(value.right) ? Math.max(0, Math.min(700, value.right)) : 384 };
        }
        catch {
            return { left: 288, right: 384 };
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('cc-panel-layout', JSON.stringify(panels));
        }
        catch { /* Storage may be disabled. */ }
    }, [panels]);
    const resize = (side: 'left' | 'right', requested: number) => {
        setPanels(previous => {
            const other = side === 'left' ? 'right' : 'left';
            const available = Math.max(0, (container.current?.clientWidth || window.innerWidth) - 340);
            const width = requested < 100 ? 0 : Math.max(180, Math.min(700, requested, available));
            return { ...previous, [side]: width, [other]: Math.min(previous[other], Math.max(0, available - width)) };
        });
    };
    const refresh = useCallback(async () => {
        try {
            setState(await api.state());
            setOffline(false);
        }
        catch {
            setOffline(true);
        }
    }, []);
    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => clearInterval(timer);
    }, [refresh]);
    // Waiting approvals show in the tab title, so a paused build is noticed from other tabs too.
    const waiting = state?.approvals.length ?? 0;
    const building = state?.tasks.some((t) => t.status === 'running' || t.status === 'queued');
    useEffect(() => {
        document.title = waiting ? `(${waiting}) Approve · ClaudeCodex` : building ? 'Building… · ClaudeCodex' : 'ClaudeCodex';
    }, [waiting, building]);
    if (!state) {
        return (<main className="grid h-full place-items-center p-6 text-[var(--muted)]">
        {offline ? 'Can’t reach the ClaudeCodex server. Start it with: python3 backend.py' : 'Loading…'}
      </main>);
    }
    const task: Task | undefined = state.tasks.find((t) => t.id === taskId) ?? state.tasks[0];
    const live = state.tasks.find((t) => t.status === 'running' || t.status === 'queued');
    return (<div className="flex h-full flex-col">
      <div className="bg-[var(--raised)] px-4 py-2 text-center text-sm">Public workflow demo · browser only · no AI, commands or file changes</div>
      {offline && (<p role="alert" className="bg-[var(--raised)] px-4 py-1.5 text-center text-sm text-[var(--danger)]">
          Lost contact with the server. Your draft is saved; this page reconnects on its own.
        </p>)}
      <header className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 lg:hidden">
        <button onClick={() => setDrawer('left')} aria-label="Project and agents" className="rounded p-1.5 hover:bg-[var(--raised)]"><PanelLeft className="size-5"/></button>
        <span className="font-semibold">ClaudeCodex</span>
        {live && <LiveBaton task={live}/>}
        <button onClick={() => setDrawer('right')} aria-label="Build tasks" className="ml-auto rounded p-1.5 hover:bg-[var(--raised)]"><PanelRight className="size-5"/></button>
      </header>

      <div className="hidden items-center gap-2 border-b border-[var(--line)] px-3 py-1.5 lg:flex">
        <button aria-label={panels.left ? 'Hide left panel' : 'Show left panel'} aria-expanded={panels.left > 0} onClick={() => resize('left', panels.left ? 0 : 288)} className="rounded px-2 py-1 hover:bg-[var(--raised)]"><PanelLeft className="size-4"/></button>
        <span className="text-xs text-[var(--muted)]">Drag panel borders to resize · double-click a border to hide</span>
        <button aria-label={panels.right ? 'Hide right panel' : 'Show right panel'} aria-expanded={panels.right > 0} onClick={() => resize('right', panels.right ? 0 : 384)} className="ml-auto rounded px-2 py-1 hover:bg-[var(--raised)]"><PanelRight className="size-4"/></button>
      </div>
      <div ref={container} className="flex min-h-0 flex-1" style={{ '--left-width': `${panels.left}px`, '--right-width': `${panels.right}px` } as React.CSSProperties}>
        <aside className={`${drawer === 'left' ? 'fixed inset-0 z-20 block' : 'hidden'} w-full bg-[var(--panel)] cc-side cc-left lg:static lg:block lg:shrink-0 lg:border-r lg:border-[var(--line)]`}>
          {drawer === 'left' && <CloseDrawer onClose={() => setDrawer(null)}/>}
          <Sidebar state={state} onChange={refresh} onOpenContext={() => { setContextOpen(true); setDrawer(null); }}/>
        </aside>

        <PanelHandle side="left" width={panels.left} onResize={resize}/>
        <main className="min-w-0 flex-1">
          <Chat state={state} onChange={refresh} onSelectTask={(id) => { setTaskId(id); setDrawer('right'); if (!panels.right)
        resize('right', 384); }}/>
        </main>

        <PanelHandle side="right" width={panels.right} onResize={resize}/>
        <aside className={`${drawer === 'right' ? 'fixed inset-0 z-20 block' : 'hidden'} w-full overflow-y-auto scroll-thin bg-[var(--panel)] cc-side cc-right lg:static lg:block lg:shrink-0 lg:border-l lg:border-[var(--line)]`}>
          {drawer === 'right' && <CloseDrawer onClose={() => setDrawer(null)}/>}
          <div className="flex flex-col gap-8 px-5 py-6">
            <Activity project={state.project} onSelectTask={setTaskId}/>
            <section aria-labelledby="task-heading">
              <h2 id="task-heading" className="mb-4 text-sm font-semibold">Build relay</h2>
              {task ? <Relay task={task} onChange={refresh} onSelect={setTaskId}/> : <RelayPreview state={state}/>}
            </section>
            {state.tasks.length > 1 && (<section aria-labelledby="history-heading">
                <h2 id="history-heading" className="mb-2 text-sm font-semibold">Earlier builds</h2>
                <ul className="flex flex-col">
                  {state.tasks.map((t) => (<li key={t.id}>
                      <button onClick={() => setTaskId(t.id)} className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--raised)] ${t.id === task?.id ? 'bg-[var(--raised)]' : ''}`}>
                        <span className="line-clamp-1">{t.goal}</span>
                        <span className="text-xs text-[var(--muted)]">{t.status} · {new Date(t.created).toLocaleString()}</span>
                      </button>
                    </li>))}
                </ul>
              </section>)}
            <a href="#" onClick={(e) => { e.preventDefault(); api.exportTranscript(); }} className="inline-flex items-center gap-2 self-start text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              <Download className="size-4" aria-hidden/> Download transcript
            </a>
          </div>
        </aside>
      </div>

      {contextOpen && <ContextDialog initial={state.context} onClose={() => { setContextOpen(false); refresh(); }}/>}
    </div>);
}
function PanelHandle({ side, width, onResize }: {
    side: 'left' | 'right';
    width: number;
    onResize: (side: 'left' | 'right', width: number) => void;
}) {
    const drag = useRef<{
        x: number;
        width: number;
    } | null>(null);
    return <div role="separator" aria-label={`Resize ${side} panel`} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={700} aria-valuenow={Math.round(width)} tabIndex={0} className="hidden w-2 shrink-0 cursor-col-resize touch-none bg-[var(--line)] hover:bg-[var(--focus)] lg:block" onDoubleClick={() => onResize(side, width ? 0 : side === 'left' ? 288 : 384)} onPointerDown={e => { if (e.button !== 0)
        return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, width }; }} onPointerMove={e => { if (drag.current)
        onResize(side, drag.current.width + (e.clientX - drag.current.x) * (side === 'left' ? 1 : -1)); }} onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Home') {
                e.preventDefault();
                onResize(side, width ? 0 : 288);
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                onResize(side, (width || 180) + (e.key === 'ArrowRight' ? 24 : -24) * (side === 'left' ? 1 : -1));
            }
        }}/>;
}
/** Before the first build, show the funnel itself so the order is clear. */
const FUNNEL: [
    string,
    AgentId,
    string,
    string
][] = [
    ['Design', 'astra', 'Astra', 'Writes the instructions and design (hard; Opus designs medium builds).'],
    ['Precision', 'claude', 'Opus', 'Makes the design precise: interfaces, rules, edge cases, tests.'],
    ['Point-by-point spec', 'antigravity', 'Antigravity', 'Every file and exactly what it must contain. All three go into Qwen’s memory.'],
    ['Code', 'antigravity', 'Flash 1–8', 'The Flash coders write every file in parallel. Qwen doesn’t write code.'],
    ['Run & test', 'qwen', 'Sandbox', 'Runs the checks in the sandbox.'],
    ['Fix in branches', 'qwen', 'Qwen + Flash 1–8', 'Qwen splits the failures into distinct problems (free, local); each Flash fixes a different one in its own copy. Qwen makes small patches when Flash is out of quota.'],
    ['Perfect', 'antigravity', 'Antigravity, then Opus', 'Do most of the perfecting in the staging copy.'],
    ['Debate', 'sol', 'Opus vs Sol', 'Only when you click Debate on a finished build (token-heavy).'],
    ['Final judgement', 'astra', 'Astra', 'Common sense: does it actually work for you? (hard builds)'],
];
function RelayPreview({ state }: {
    state: State;
}) {
    const on = (id: AgentId) => state.agents.find((a) => a.id === id)?.available;
    const stages: Stage[] = FUNNEL.map(([phase, agent, name, summary], i) => ({
        id: String(i), phase, agent, name, summary: on(agent) ? summary : `${summary} Signed out, so skipped.`,
        state: on(agent) ? 'waiting' : 'skipped',
    }));
    return (<div>
      <p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">
        No sample tasks yet. This diagram illustrates the private product workflow; the public demo runs no agents or code.
      </p>
      <ol>{stages.map((s, i) => <Station key={s.id} stage={s} last={i === stages.length - 1}/>)}</ol>
    </div>);
}
function LiveBaton({ task }: {
    task: Task;
}) {
    const stage = task.stages.find((s) => s.state === 'working');
    if (!stage)
        return null;
    return (<span className="flex items-center gap-1.5 text-sm" style={{ color: AGENT_COLOR[stage.agent] }}>
      <span className="baton-live size-2.5 rounded-full" style={{ background: AGENT_COLOR[stage.agent] }} aria-hidden/>
      {stage.name} working
    </span>);
}
function CloseDrawer({ onClose }: {
    onClose: () => void;
}) {
    return (<button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded p-1.5 hover:bg-[var(--raised)] lg:hidden">
      <X className="size-5"/>
    </button>);
}
function ContextDialog({ initial, onClose }: {
    initial: string;
    onClose: () => void;
}) {
    const [text, setText] = useState(initial);
    const [error, setError] = useState('');
    const save = async () => {
        try {
            await api.saveContext(text);
            onClose();
        }
        catch (e) {
            setError((e as Error).message);
        }
    };
    return (<div role="dialog" aria-modal="true" aria-labelledby="context-title" className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg bg-[var(--panel)] p-5 ring-1 ring-[var(--line)]">
        <h2 id="context-title" className="font-semibold">Shared context</h2>
        <p className="text-sm text-[var(--muted)]">Facts and decisions every agent should know. Qwen searches this with each request.</p>
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={18} className="min-h-0 flex-1 rounded-md bg-[var(--ground)] p-3 font-mono text-[13px] leading-5 ring-1 ring-[var(--line)]"/>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)]">Cancel</button>
          <button onClick={save} className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--ground)]">Save context</button>
        </div>
      </div>
    </div>);
}
