'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, CheckCircle2, Clock, AlertCircle, Bot, ListTodo, Bell } from 'lucide-react';

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeAgents: number;
  totalMessages: number;
  activeTriggers: number;
}

interface AgentStatus {
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  tasksInProgress: number;
  lastActivity: string;
}

interface Task {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  created: string;
  tags: string[];
  routingReason?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [tasks, setTasks] = useState<{ pending: Task[]; inProgress: Task[]; completed: Task[]; failed: Task[] } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const apiBase = '/api/proxy';
      const [statsRes, agentsRes, tasksRes, logsRes] = await Promise.all([
        fetch(`${apiBase}/stats`),
        fetch(`${apiBase}/agents`),
        fetch(`${apiBase}/tasks`),
        fetch(`${apiBase}/logs?limit=20`),
      ]);

      const [statsData, agentsData, tasksData, logsData] = await Promise.all([
        statsRes.json(),
        agentsRes.json(),
        tasksRes.json(),
        logsRes.json(),
      ]);

      setStats(statsData);
      setAgents(agentsData);
      setTasks(tasksData);
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'idle':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'error':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 animate-spin text-violet-500" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-1">Agentic OS Dashboard</h1>
            <p className="text-slate-400">Multi-agent orchestration system</p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Pending Tasks</CardTitle>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">{stats?.pendingTasks || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Waiting for assignment</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">In Progress</CardTitle>
                <Activity className="w-4 h-4 text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">{stats?.inProgressTasks || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Being worked on</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Completed</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">{stats?.completedTasks || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Successfully finished</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Active Triggers</CardTitle>
                <AlertCircle className="w-4 h-4 text-violet-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">{stats?.activeTriggers || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Event triggers firing</p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent.name} className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-violet-400" />
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${getStatusColor(agent.status)}`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <p className="text-sm text-slate-400 capitalize">{agent.status}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.currentTask && (
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Current Task</p>
                    <p className="text-sm text-slate-200">{agent.currentTask}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Completed</p>
                    <p className="text-2xl font-bold text-slate-100">{agent.tasksCompleted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">In Progress</p>
                    <p className="text-2xl font-bold text-slate-100">{agent.tasksInProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tasks Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Task Queue
            </CardTitle>
            <CardDescription>Real-time task status and assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                <TabsTrigger value="pending">Pending ({tasks?.pending.length || 0})</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress ({tasks?.inProgress.length || 0})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({tasks?.completed.length || 0})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({tasks?.failed.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Task</TableHead>
                        <TableHead className="text-slate-400">Priority</TableHead>
                        <TableHead className="text-slate-400">Assigned To</TableHead>
                        <TableHead className="text-slate-400">Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks?.pending.map((task) => (
                        <TableRow key={task.id} className="border-slate-800">
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority) as any}>{task.priority}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{task.assignedTo}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {task.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!tasks?.pending || tasks.pending.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                            No pending tasks
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="in-progress" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Task</TableHead>
                        <TableHead className="text-slate-400">Priority</TableHead>
                        <TableHead className="text-slate-400">Assigned To</TableHead>
                        <TableHead className="text-slate-400">Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks?.inProgress.map((task) => (
                        <TableRow key={task.id} className="border-slate-800">
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority) as any}>{task.priority}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{task.assignedTo}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {task.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!tasks?.inProgress || tasks.inProgress.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                            No tasks in progress
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Task</TableHead>
                        <TableHead className="text-slate-400">Priority</TableHead>
                        <TableHead className="text-slate-400">Assigned To</TableHead>
                        <TableHead className="text-slate-400">Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks?.completed.map((task) => (
                        <TableRow key={task.id} className="border-slate-800">
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority) as any}>{task.priority}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{task.assignedTo}</TableCell>
                          <TableCell className="text-slate-400">{task.created}</TableCell>
                        </TableRow>
                      ))}
                      {(!tasks?.completed || tasks.completed.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                            No completed tasks
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="failed" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Task</TableHead>
                        <TableHead className="text-slate-400">Priority</TableHead>
                        <TableHead className="text-slate-400">Assigned To</TableHead>
                        <TableHead className="text-slate-400">Failed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks?.failed.map((task) => (
                        <TableRow key={task.id} className="border-slate-800">
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{task.priority}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{task.assignedTo}</TableCell>
                          <TableCell className="text-slate-400">{task.created}</TableCell>
                        </TableRow>
                      ))}
                      {(!tasks?.failed || tasks.failed.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                            No failed tasks
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 20 log entries from orchestrator and event triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded hover:bg-slate-800 transition-colors">
                    <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                    <span className={`uppercase font-bold w-16 shrink-0 ${getLogLevelColor(log.level)}`}>
                      [{log.level}]
                    </span>
                    <span className="text-slate-400 shrink-0">[{log.source}]</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center text-slate-400 py-8">No recent activity</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
