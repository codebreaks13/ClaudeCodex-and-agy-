export type AgentId = 'qwen' | 'antigravity' | 'claude' | 'astra' | 'sol';
export interface Agent {
    id: AgentId;
    name: string;
    role: string;
    kind: 'local' | 'cloud';
    available: boolean;
    reason: string;
    enable?: string;
    model?: string | null;
    budgetLeft?: number;
    budget?: number;
}
export type Level = 'auto' | 'easy' | 'medium' | 'hard';
export interface Message {
    id: string;
    time: string;
    sender: 'you' | 'system' | AgentId;
    to: string;
    text: string;
    task?: string | null;
    hidden?: boolean;
}
export type StageState = 'waiting' | 'working' | 'done' | 'handed_off' | 'stopped' | 'skipped' | 'approved' | 'changes_requested' | 'failed' | 'not_needed';
export interface Stage {
    id: string;
    phase: string;
    agent: AgentId;
    name: string;
    state: StageState;
    summary?: string;
    detail?: string;
    review?: boolean;
}
export interface Task {
    id: string;
    goal: string;
    project: string;
    created: string;
    started?: string;
    finished?: string;
    status: 'queued' | 'running' | 'complete' | 'incomplete' | 'failed' | 'stopped' | 'interrupted';
    stages: Stage[];
    changed: string[];
    level?: Level;
    level_by?: string;
    undone?: string;
    applied?: string;
    discarded?: string;
    checks?: string[];
    setup?: string[];
    error?: string;
}
export interface Approval {
    id: string;
    kind: 'build' | 'command';
    payload: {
        goal?: string;
        level?: string;
        command?: string;
        network?: boolean;
    };
    requested_by: string;
    task?: string | null;
    created: string;
}
export interface State {
    messages: Message[];
    agents: Agent[];
    project: string | null;
    projectValid: boolean;
    tasks: Task[];
    context: string;
    pendingChats: number;
    canBrowse: boolean;
    approvals: Approval[];
    link: {
        paired: boolean;
        connected?: boolean;
        laptop?: string | null;
        address?: string;
    };
}
export interface ActivityData {
    observed_at: string;
    project_selected: boolean;
    tasks: {
        id: string;
        goal: string;
        status: string;
        created?: string;
        change_count: number;
        changed: string[];
        applied: boolean;
        undone: boolean;
        discarded: boolean;
        active_stage: {
            phase: string;
            agent: string;
            name: string;
        } | null;
    }[];
    git: {
        status: string;
        note: string;
        branch?: string;
        head?: string;
        change_count?: number;
        changes?: {
            path: string;
            index: string;
            worktree: string;
        }[];
        commits?: {
            hash: string;
            date: string;
            subject: string;
        }[];
        upstream?: string | null;
        ahead?: number | null;
        behind?: number | null;
        repository_url?: string | null;
        remote_verification?: {
            status: string;
            note: string;
            checked_at?: string;
            hash?: string;
        };
    };
}
export const AGENT_COLOR: Record<string, string> = {
    qwen: 'var(--qwen)',
    antigravity: 'var(--agy)',
    claude: 'var(--claude)',
    astra: 'var(--astra)',
    sol: 'var(--sol)',
    you: 'var(--ink)',
    system: 'var(--muted)',
};
export const displayName = (sender: string, agents: Agent[]) => sender === 'you' ? 'You' : sender === 'system' ? 'ClaudeCodex' : agents.find((a) => a.id === sender)?.name ?? sender;
export { api } from "./demoApi";
