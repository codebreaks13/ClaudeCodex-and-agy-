import { useEffect, useRef, useState } from 'react';
import { ArrowUp, EyeOff, Eye, Hammer, MessageSquare } from 'lucide-react';
import { Agent, AGENT_COLOR, api, displayName, Level, Message, State } from './api';
const DRAFT_KEY = 'claudecodex.public-demo.draft';
function readDraft() {
    try {
        return localStorage.getItem(DRAFT_KEY) ?? '';
    }
    catch {
        return '';
    }
}
function writeDraft(value: string) {
    try {
        value ? localStorage.setItem(DRAFT_KEY, value) : localStorage.removeItem(DRAFT_KEY);
    }
    catch { /* storage blocked */ }
}
export function Chat({ state, onChange, onSelectTask }: {
    state: State;
    onChange: () => void;
    onSelectTask: (id: string) => void;
}) {
    const endRef = useRef<HTMLDivElement>(null);
    const count = state.messages.length;
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [count]);
    return (<div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
          {count === 0 && <Empty hasProject={!!state.project}/>}
          <Approvals state={state} onChange={onChange}/>
          {state.messages.map((m) => (<Line key={m.id} message={m} agents={state.agents} onSelectTask={onSelectTask} onChange={onChange}/>))}
          {state.pendingChats > 0 && (<p className="text-sm text-[var(--muted)]" role="status">Waiting for a reply…</p>)}
          <div ref={endRef}/>
        </div>
      </div>
      <Composer state={state} onChange={onChange} onSelectTask={onSelectTask}/>
    </div>);
}
function Approvals({ state, onChange }: {
    state: State;
    onChange: () => void;
}) {
    const [error, setError] = useState('');
    if (!state.approvals.length)
        return null;
    const decide = async (id: string, approve: boolean) => {
        try {
            await api.decide(id, approve);
            setError('');
            onChange();
        }
        catch (e) {
            setError((e as Error).message);
        }
    };
    return (<section aria-labelledby="approvals-heading" className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg bg-[var(--raised)] p-4 ring-1 ring-[var(--claude)]">
      <h2 id="approvals-heading" className="text-sm font-semibold">Waiting for your approval</h2>
      {state.approvals.map((item) => (<div key={item.id} className="flex flex-col gap-2 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
          {item.kind === 'build' ? (<p className="text-sm leading-relaxed">
              <span style={{ color: AGENT_COLOR[item.requested_by] }} className="font-medium">{displayName(item.requested_by, state.agents)}</span>{' '}
              proposes a build{item.payload.level && item.payload.level !== 'auto' ? ` (${item.payload.level})` : ''}: {item.payload.goal}
            </p>) : (<div className="text-sm">
              <p>A build wants to run this with internet access, inside the sandbox:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-[var(--ground)] p-2 font-mono text-[12.5px]">{item.payload.command}</pre>
            </div>)}
          <div className="flex gap-2">
            <button onClick={() => decide(item.id, true)} className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--ground)]">
              {item.kind === 'build' ? 'Approve and build' : 'Approve and run'}
            </button>
            <button onClick={() => decide(item.id, false)} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)]">Dismiss</button>
          </div>
        </div>))}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    </section>);
}
function Empty({ hasProject }: {
    hasProject: boolean;
}) {
    return (<div className="max-w-xl py-10">
      <p className="text-2xl font-semibold tracking-tight">Explore the staged workflow.</p>
      <p className="mt-3 leading-relaxed text-[var(--muted)]">
        {hasProject ? '' : 'Select the demo workspace first. '}
        <strong className="text-[var(--ink)]">Build</strong> creates a labelled sample relay, so you can inspect a diff, Apply and Undo in browser memory. <strong className="text-[var(--ink)]">Ask</strong> records a note. No model is connected and no code is executed.
      </p>
    </div>);
}
const FLAGGED = /safeguards flagged/i;
function Line({ message, agents, onSelectTask, onChange }: {
    message: Message;
    agents: Agent[];
    onSelectTask: (id: string) => void;
    onChange: () => void;
}) {
    const toggleHidden = async () => {
        try {
            await api.hide(message.id, !message.hidden);
            onChange();
        }
        catch { /* next poll shows the real state */ }
    };
    const color = AGENT_COLOR[message.sender] ?? 'var(--muted)';
    const system = message.sender === 'system';
    const time = new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const to = message.sender !== 'you' ? ''
        : message.to === 'build' ? 'build goal'
            : message.to === 'all' ? 'to everyone'
                : message.to === 'debate' ? 'to the debate'
                    : message.to === 'none' ? 'note' : `to ${displayName(message.to, agents)}`;
    return (<article className={`group border-l-2 pl-4 ${system ? 'text-sm text-[var(--muted)]' : ''} ${message.hidden ? 'opacity-50' : ''}`} style={{ borderColor: system ? 'var(--line)' : color, borderStyle: message.hidden ? 'dashed' : 'solid' }}>
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold" style={{ color }}>{displayName(message.sender, agents)}</span>
        {to && <span className="text-[var(--muted)]">{to}</span>}
        <time className="text-xs text-[var(--muted)]" dateTime={message.time}>{time}</time>
        {message.task && (<button onClick={() => onSelectTask(message.task!)} className="text-xs text-[var(--muted)] underline decoration-dotted hover:text-[var(--ink)]">
            view task
          </button>)}
        {message.hidden && <span className="text-xs text-[var(--muted)]">hidden from agents</span>}
        {!system && (<button onClick={toggleHidden} className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--muted)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-[var(--ink)]">
            {message.hidden ? <Eye className="size-3.5" aria-hidden/> : <EyeOff className="size-3.5" aria-hidden/>}
            {message.hidden ? 'Show to agents' : 'Hide from agents'}
          </button>)}
      </header>
      <Body text={message.text}/>
      {system && FLAGGED.test(message.text) && (<p className="mt-1 text-[13px] text-[var(--ink)]">
          Every reply includes the recent chat, so one flagged message blocks the ones after it. Hide the message
          that caused it (hover it, then “Hide from agents”) and send again.
        </p>)}
    </article>);
}
/** Plain text with fenced code blocks; no HTML is ever injected. */
function Body({ text }: {
    text: string;
}) {
    const parts = text.split(/```[\w+-]*\n?/);
    return (<div className="flex flex-col gap-2 leading-relaxed">
      {parts.map((part, i) => i % 2 ? (<pre key={i} className="overflow-x-auto rounded-md bg-[var(--ground)] p-3 font-mono text-[13px] leading-5 ring-1 ring-[var(--line)] scroll-thin">
          {part.replace(/\n$/, '')}
        </pre>) : part.trim() ? (<p key={i} className="whitespace-pre-wrap break-words">{part.trim()}</p>) : null)}
    </div>);
}
function Composer({ state, onChange, onSelectTask }: {
    state: State;
    onChange: () => void;
    onSelectTask: (id: string) => void;
}) {
    const [text, setText] = useState(readDraft);
    const [mode, setMode] = useState<'ask' | 'build'>('ask');
    const [to, setTo] = useState('qwen');
    const [level, setLevel] = useState<Level>('auto');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const running = state.tasks.some((t) => (t.status === 'running' || t.status === 'queued') && t.project === state.project);
    const recipient = state.agents.find((a) => a.id === to);
    const anyone = state.agents.filter((a) => a.available).length;
    const debaters = ['claude', 'sol'].every((id) => state.agents.find((a) => a.id === id)?.available);
    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const value = text.trim();
        if (!value || sending)
            return;
        setSending(true);
        setError('');
        try {
            if (mode === 'build') {
                const task = await api.build(value, level);
                onSelectTask(task.id);
            }
            else {
                await api.message(value, to, level);
            }
            setText('');
            writeDraft('');
            onChange();
        }
        catch (err) {
            setError((err as Error).message);
        }
        finally {
            setSending(false);
        }
    };
    const blocked = mode === 'build'
        ? (!state.project ? 'Choose a project folder first.' : running ? 'A build is already running for this folder; choose another folder to start one more.' : '')
        : to === 'all' ? (anyone ? '' : 'Nobody is available yet.')
            : to === 'debate' ? (debaters ? '' : 'The debate needs both Claude Opus and Codex Sol signed in.')
                : (recipient && !recipient.available ? `${recipient.name}: ${recipient.reason}` : '');
    return (<form onSubmit={submit} className="border-t border-[var(--line)] bg-[var(--panel)] px-5 pb-5 pt-3">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Mode" className="inline-flex rounded-md bg-[var(--ground)] p-0.5 ring-1 ring-[var(--line)]">
            {(['ask', 'build'] as const).map((m) => (<button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm ${mode === m ? 'bg-[var(--raised)] font-medium ring-1 ring-[var(--line)]' : 'text-[var(--muted)]'}`}>
                {m === 'ask' ? <MessageSquare className="size-3.5" aria-hidden/> : <Hammer className="size-3.5" aria-hidden/>}
                {m === 'ask' ? 'Ask' : 'Build'}
              </button>))}
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]" title="Auto: Antigravity rates it (Qwen only if Antigravity is signed out and Qwen is idle). Easy: spec, code, test, Antigravity perfects. Medium: Opus designs and perfects too. Hard: Astra designs and judges, Opus adds a precision pass.">
            Difficulty
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="rounded-md bg-[var(--ground)] px-2 py-1 text-[var(--ink)] ring-1 ring-[var(--line)]">
              <option value="auto">Auto</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          {mode === 'ask' ? (<label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              Send to
              <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md bg-[var(--ground)] px-2 py-1 text-[var(--ink)] ring-1 ring-[var(--line)]">
                {state.agents.map((a) => (<option key={a.id} value={a.id} disabled={!a.available}>
                    {a.name}{a.available ? '' : a.kind === 'local' ? ' (offline)' : ' (signed out)'}
                  </option>))}

                <option value="all" disabled={!anyone}>Everyone available{anyone ? ` (${anyone})` : ''}</option>
                <option value="none">Nobody (note to self)</option>
              </select>
            </label>) : (<span className="text-sm text-[var(--muted)]">Creates a canned sample relay. No agents or models run.</span>)}
        </div>
        <div className="flex items-end gap-2 rounded-lg bg-[var(--ground)] p-2 ring-1 ring-[var(--line)] focus-within:ring-[var(--muted)]">
          <label htmlFor="composer" className="sr-only">{mode === 'build' ? 'Build goal' : 'Message'}</label>
          <textarea id="composer" rows={3} value={text} onChange={(e) => { setText(e.target.value); writeDraft(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
        submit(); }} placeholder={mode === 'build' ? 'Describe any idea, e.g. "A command-line tool that renames my photos by the date they were taken"' : 'Message'} className="max-h-64 min-h-[3.5rem] flex-1 resize-y bg-transparent px-2 py-1 leading-relaxed outline-none placeholder:text-[var(--muted)]"/>
          <button disabled={!text.trim() || sending || !!blocked} aria-label={mode === 'build' ? 'Start build' : 'Send'} className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--ground)] disabled:opacity-40" style={{ background: mode === 'build' ? 'var(--qwen)' : 'var(--ink)' }}>
            {mode === 'build' ? <Hammer className="size-4" aria-hidden/> : <ArrowUp className="size-4" aria-hidden/>}
          </button>
        </div>
        <p className="mt-1.5 min-h-5 text-[13px]" role="alert" style={{ color: error ? 'var(--danger)' : 'var(--muted)' }}>
          {error || blocked || (mode === 'ask' && to === 'debate'
            ? 'They answer separately, then argue until they agree on one position or show why they can’t. Difficulty sets the number of rounds.'
            : mode === 'ask' && to === 'all'
                ? 'Answers in rising authority; the highest one asked has the final say. Easy asks Qwen and Antigravity, medium adds Claude Opus, hard adds Astra.'
                : 'Ctrl+Enter to send. Drafts are kept if you close the page.')}
        </p>
      </div>
    </form>);
}
