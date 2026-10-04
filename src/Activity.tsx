import { useEffect, useState } from 'react';
import { api } from './api';
import type { Task } from './api';
export function Activity({ project, onSelectTask }: {
    project: string | null;
    onSelectTask: (id: string) => void;
}) {
    const [tasks, setTasks] = useState<Task[]>([]);
    useEffect(() => { const load = () => api.state().then(s => setTasks(s.tasks)); void load(); const timer = setInterval(load, 2000); return () => clearInterval(timer); }, [project]);
    return <section><h2 className="font-semibold">Demo activity</h2><p className="my-2 text-xs text-[var(--muted)]">In-memory samples only. No actual Git commits or pushes are performed.</p>{tasks.map(t => <button key={t.id} className="block w-full rounded p-2 text-left hover:bg-[var(--raised)]" onClick={() => onSelectTask(t.id)}>{t.goal}<span className="block text-xs text-[var(--muted)]">{t.undone ? 'Sample undone' : t.applied ? 'Sample applied' : t.discarded ? 'Sample discarded' : t.status}</span></button>)}</section>;
}
