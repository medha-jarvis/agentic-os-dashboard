import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = '/docker/hermes-agent-owlt/data';

export interface AgentStatus {
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  tasksInProgress: number;
  lastActivity: string;
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  created: string;
  tags: string[];
  routingReason?: string;
}

export interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeAgents: number;
  totalMessages: number;
  activeTriggers: number;
}

export interface PortfolioData {
  totalValue: number;
  invested: number;
  pnl: number;
  pnlPercentage: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: string;
}

// Parse task file
async function parseTaskFile(filePath: string): Promise<Task | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let inFrontmatter = false;
    const metadata: any = {};
    let title = '';

    for (const line of lines) {
      if (line.trim() === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }

      if (inFrontmatter) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          if (key === 'tags') {
            metadata[key] = value.replace(/[\[\]]/g, '').split(',').map(t => t.trim());
          } else {
            metadata[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      } else if (line.startsWith('# ')) {
        title = line.replace('# ', '').trim();
        break;
      }
    }

    return {
      id: metadata.id || '',
      title: metadata.title || title,
      assignedTo: metadata.assigned_to || 'unassigned',
      priority: metadata.priority || 'normal',
      status: metadata.status || 'pending',
      created: metadata.created || '',
      tags: metadata.tags || [],
      routingReason: metadata.routing_reason,
    };
  } catch (error) {
    return null;
  }
}

// Get all tasks from a directory
async function getTasksFromDir(dir: string): Promise<Task[]> {
  try {
    const files = await fs.readdir(dir);
    const tasks = await Promise.all(
      files
        .filter(f => f.endsWith('.md'))
        .map(f => parseTaskFile(join(dir, f)))
    );
    return tasks.filter((t): t is Task => t !== null);
  } catch (error) {
    return [];
  }
}

// Get dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  const [pending, inProgress, completed, failed] = await Promise.all([
    getTasksFromDir(join(DATA_DIR, 'tasks/pending')),
    getTasksFromDir(join(DATA_DIR, 'tasks/in-progress')),
    getTasksFromDir(join(DATA_DIR, 'tasks/completed')),
    getTasksFromDir(join(DATA_DIR, 'tasks/failed')),
  ]);

  // Count messages
  let totalMessages = 0;
  try {
    const medhaInbox = await fs.readdir(join(DATA_DIR, 'messages/inbox-medha'));
    const hermesInbox = await fs.readdir(join(DATA_DIR, 'messages/inbox-hermes'));
    totalMessages = medhaInbox.length + hermesInbox.length;
  } catch (error) {
    // Ignore
  }

  // Count active triggers
  let activeTriggers = 0;
  try {
    const stateFile = join(DATA_DIR, 'scripts/.event-trigger-state.json');
    const stateContent = await fs.readFile(stateFile, 'utf-8');
    const state = JSON.parse(stateContent);
    activeTriggers = Object.keys(state).length;
  } catch (error) {
    // Ignore
  }

  return {
    totalTasks: pending.length + inProgress.length + completed.length + failed.length,
    pendingTasks: pending.length,
    inProgressTasks: inProgress.length,
    completedTasks: completed.length,
    failedTasks: failed.length,
    activeAgents: 2, // Medha and Hermes
    totalMessages,
    activeTriggers,
  };
}

// Get all tasks
export async function getAllTasks(): Promise<{
  pending: Task[];
  inProgress: Task[];
  completed: Task[];
  failed: Task[];
}> {
  const [pending, inProgress, completed, failed] = await Promise.all([
    getTasksFromDir(join(DATA_DIR, 'tasks/pending')),
    getTasksFromDir(join(DATA_DIR, 'tasks/in-progress')),
    getTasksFromDir(join(DATA_DIR, 'tasks/completed')),
    getTasksFromDir(join(DATA_DIR, 'tasks/failed')),
  ]);

  return { pending, inProgress, completed, failed };
}

// Get agent status
export async function getAgentStatus(): Promise<AgentStatus[]> {
  const tasks = await getAllTasks();

  const medhaTasks = tasks.inProgress.filter(t => t.assignedTo === 'medha');
  const hermesTasks = tasks.inProgress.filter(t => t.assignedTo === 'hermes');

  const medhaCompleted = tasks.completed.filter(t => t.assignedTo === 'medha').length;
  const hermesCompleted = tasks.completed.filter(t => t.assignedTo === 'hermes').length;

  return [
    {
      name: 'Medha',
      status: medhaTasks.length > 0 ? 'busy' : 'idle',
      currentTask: medhaTasks[0]?.title,
      tasksCompleted: medhaCompleted,
      tasksInProgress: medhaTasks.length,
      lastActivity: new Date().toISOString(),
    },
    {
      name: 'Hermes',
      status: hermesTasks.length > 0 ? 'busy' : 'idle',
      currentTask: hermesTasks[0]?.title,
      tasksCompleted: hermesCompleted,
      tasksInProgress: hermesTasks.length,
      lastActivity: new Date().toISOString(),
    },
  ];
}

// Get portfolio data
export async function getPortfolioData(): Promise<PortfolioData> {
  try {
    const portfolioPath = join(DATA_DIR, 'wiki/entities/portfolio.md');
    const content = await fs.readFile(portfolioPath, 'utf-8');

    // Parse portfolio.md for total value and PnL
    // Look for patterns like: **Total Invested:** ₹3,66,09,051
    const investedMatch = content.match(/\*\*Total Invested:\*\*\s*₹([\d,]+)/);
    const currentMatch = content.match(/\*\*Current Value:\*\*\s*₹([\d,]+)/);
    const pnlMatch = content.match(/\*\*Total PnL:\*\*\s*₹([\d,]+)\s*\(([+-]?\d+\.?\d*)%\)/);

    const invested = investedMatch ? parseFloat(investedMatch[1].replace(/,/g, '')) : 0;
    const totalValue = currentMatch ? parseFloat(currentMatch[1].replace(/,/g, '')) : 0;
    const pnl = pnlMatch ? parseFloat(pnlMatch[1].replace(/,/g, '')) : 0;
    const pnlPercentage = pnlMatch ? parseFloat(pnlMatch[2]) : 0;

    return {
      totalValue,
      invested,
      pnl,
      pnlPercentage,
    };
  } catch (error) {
    return {
      totalValue: 0,
      invested: 0,
      pnl: 0,
      pnlPercentage: 0,
    };
  }
}

// Get recent logs
export async function getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
  const logs: LogEntry[] = [];

  try {
    // Read orchestrator log
    const orchLogPath = join(DATA_DIR, 'logs/orchestrator.log');
    const orchContent = await fs.readFile(orchLogPath, 'utf-8');
    const orchLines = orchContent.split('\n').filter(l => l.trim()).slice(-limit);

    for (const line of orchLines) {
      const match = line.match(/\[(.+?)\]\s+(.+)/);
      if (match) {
        logs.push({
          timestamp: match[1],
          level: line.includes('ERROR') ? 'error' : line.includes('WARNING') ? 'warn' : 'info',
          message: match[2],
          source: 'orchestrator',
        });
      }
    }
  } catch (error) {
    // Ignore
  }

  try {
    // Read event triggers log
    const eventLogPath = join(DATA_DIR, 'logs/event-triggers.log');
    const eventContent = await fs.readFile(eventLogPath, 'utf-8');
    const eventLines = eventContent.split('\n').filter(l => l.trim()).slice(-limit);

    for (const line of eventLines) {
      const match = line.match(/\[(.+?)\]\s+\[(.+?)\]\s+(.+)/);
      if (match) {
        logs.push({
          timestamp: match[1],
          level: match[2].toLowerCase() as any,
          message: match[3],
          source: 'event-triggers',
        });
      }
    }
  } catch (error) {
    // Ignore
  }

  return logs.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, limit);
}
