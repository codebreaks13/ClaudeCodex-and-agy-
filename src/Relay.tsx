import { useState } from 'react';
import { Undo2, Square, FolderInput, Trash2, FileDiff, RotateCw, MessagesSquare } from 'lucide-react';
import { AGENT_COLOR, api, Stage, Task } from './api';
const STATE_LABEL: Record<string, string> = {
    waiting: 'Waiting',
    working: 'Working',
    done: 'Finished the goal',
    handed_off: 'Handed off',
    stopped: 'Stopped here',
    skipped: 'Skipped',
    approved: 'Approved',
    changes_requested: 'Changes requested',
    failed: 'Failed',
    not_needed: 'Not needed at this level',
};
const TASK_LABEL: Record<Task['status'], string> = {
    queued: 'Starting',
    running: 'Running',
    complete: 'Complete',
    incomplete: 'Incomplete',
    failed: 'Failed',
    stopped: 'Stopped',
    interrupted: 'Interrupted',
};
/** The relay track: the goal moves down it like a baton. */
export function Relay({ task, onChange, onSelect }: {
    task: Task;
    onChange: () => void;
    onSelect?: (id: string) => void;
}) {
    const [note, setNote] = useState('');
    const live = task.status === 'running' || task.status === 'queued';
    const act = async (fn: () => Promise<unknown>, done: string) => {
        try {
            await fn();
            setNote(done);
            onChange();
        }
        catch (e) {
            setNote((e as Error).message);
        }
    };
    return (<div className="flex flex-col gap-5">
      <div>
        <p className="text-xs text-[var(--muted)]">
          {TASK_LABEL[task.status]}
          {task.applied ? ', sample applied in memory' : task.discarded ? ', discarded' : !live && task.changed.length ? ', waiting for your review' : ''}
          {task.level ? `, rated ${task.level}${task.level_by ? ` by ${task.level_by}` : ''}` : ''}
          {task.undone ? ', undone' : ''}
        </p>
        <p className="mt-1 line-clamp-4 font-medium leading-snug">{task.goal}</p>
      </div>

      <ol className="relative">
        {task.stages.length === 0 && <li className="text-sm text-[var(--muted)]">Rating the task and forming the team…</li>}
        {task.stages.map((stage, i) => (<Station key={stage.id} stage={stage} last={i === task.stages.length - 1}/>))}
      </ol>

      {task.error && <p role="alert" className="text-sm text-[var(--danger)]">{task.error}</p>}

      <div>
        <h3 className="text-sm font-semibold">{task.applied ? 'Sample file names' : 'Sample file names'}</h3>
        {task.changed.length ? (<ul className="mt-1.5 flex flex-col gap-0.5 font-mono text-[12.5px]">
            {task.changed.map((f) => <li key={f} className="break-all">{f}</li>)}
          </ul>) : (<p className="mt-1 text-sm text-[var(--muted)]">None yet.</p>)}
      </div>

      {!live && !task.applied && !task.discarded && !task.undone && task.changed.length > 0 && (<Review task={task} onChange={onChange} setNote={setNote}/>)}

      <div className="flex flex-wrap gap-2">
        {live && (<button onClick={() => act(() => api.stop(task.id), 'Stopped.')} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)]">
            <Square className="size-3.5" aria-hidden/> Stop task
          </button>)}
        {['failed', 'interrupted', 'incomplete', 'stopped'].includes(task.status) && (<button onClick={() => act(async () => { const next = await api.retry(task.id); onSelect?.(next.id); }, 'Retrying; finished steps are reused.')} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)]">
            <RotateCw className="size-3.5" aria-hidden/> Retry, reusing finished steps
          </button>)}
        {false && ['complete', 'incomplete'].includes(task.status) && !task.applied && !task.discarded && (<button onClick={() => act(() => api.debate(task.id), 'Opus and Sol are debating this build.')} title="Opus and Sol argue over the finished build until they agree. Uses many tokens on both plans." className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)]">
            <MessagesSquare className="size-3.5" aria-hidden/> Debate (Opus vs Sol, token-heavy)
          </button>)}
        {!live && task.applied && !task.undone && task.changed.length > 0 && (<button onClick={() => act(() => api.undo(task.id), 'Sample marked undone; no disk files changed.')} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)]">
            <Undo2 className="size-3.5" aria-hidden/> Undo this task's changes
          </button>)}
      </div>
      {note && <p className="text-sm text-[var(--muted)]" role="status">{note}</p>}
    </div>);
}
export function Station({ stage, last }: {
    stage: Stage;
    last: boolean;
}) {
    const color = AGENT_COLOR[stage.agent];
    const active = stage.state === 'working';
    const reached = !['waiting', 'skipped', 'not_needed'].includes(stage.state);
    const faded = ['skipped', 'not_needed'].includes(stage.state);
    return (<li className="relative flex gap-3 pb-5">
      {!last && (<span aria-hidden className="absolute left-[7px] top-4 h-full w-0.5" style={{ background: reached ? color : 'var(--line)', opacity: reached ? 0.55 : 1 }}/>)}
      <span aria-hidden className={`relative mt-1 size-4 shrink-0 rounded-full border-2 ${active ? 'baton-live' : ''}`} style={{
            color,
            borderColor: faded ? 'var(--line)' : color,
            background: active || ['done', 'approved'].includes(stage.state) ? color : 'var(--panel)',
            borderStyle: faded ? 'dashed' : 'solid',
        }}/>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium" style={{ color: faded ? 'var(--muted)' : color }}>{stage.phase}</span>
          <span className="text-[13px]" style={{ color: faded ? 'var(--muted)' : color }}>{stage.name}</span>
          {stage.state !== "waiting" && <span className="text-[13px] text-[var(--muted)]">{active && stage.detail ? stage.detail : STATE_LABEL[stage.state]}</span>}
        </p>
        {stage.summary && <p className="mt-0.5 line-clamp-5 text-[13px] leading-5 text-[var(--muted)]">{stage.summary}</p>}
      </div>
    </li>);
}
/** Look at the staged changes, then apply them to the real folder in one click, or discard them. */
function Review({ task, onChange, setNote }: {
    task: Task;
    onChange: () => void;
    setNote: (s: string) => void;
}) {
    const [diff, setDiff] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const act = async (fn: () => Promise<unknown>, done: string) => {
        setBusy(true);
        try {
            await fn();
            setNote(done);
            onChange();
        }
        catch (e) {
            setNote((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="flex flex-col gap-2 rounded-md bg-[var(--ground)] p-3 ring-1 ring-[var(--line)]">
      <p className="text-sm leading-relaxed">
        This is a canned sample diff. No checks were run and no folder is accessed. Apply and Undo only update demo status.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={async () => { try {
        setDiff(diff === null ? (await api.diff(task.id)).diff : null);
    }
    catch (e) {
        setNote((e as Error).message);
    } }} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)]">
          <FileDiff className="size-3.5" aria-hidden/> {diff === null ? 'Review changes' : 'Hide changes'}
        </button>
        <button disabled={busy} onClick={() => act(() => api.apply(task.id), 'Sample applied in memory. Undo changes its status.')} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--ground)] disabled:opacity-50">
          <FolderInput className="size-3.5" aria-hidden/> Apply sample
        </button>
        <button disabled={busy} onClick={() => act(() => api.discard(task.id), 'Sample discarded; no files were accessed.')} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1 ring-[var(--line)] hover:ring-[var(--muted)] disabled:opacity-50">
          <Trash2 className="size-3.5" aria-hidden/> Discard
        </button>
      </div>
      {diff !== null && (<pre className="max-h-96 overflow-auto rounded bg-[var(--panel)] p-2 font-mono text-[12px] leading-5 scroll-thin">
          {diff.split('\n').map((line, i) => (<span key={i} className="block" style={{ color: line.startsWith('+') && !line.startsWith('+++') ? 'var(--astra)'
                        : line.startsWith('-') && !line.startsWith('---') ? 'var(--danger)' : line.startsWith('@@') ? 'var(--agy)' : undefined }}>
              {line || ' '}
            </span>))}
        </pre>)}
    </div>);
}
