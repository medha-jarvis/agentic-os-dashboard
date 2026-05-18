'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity, CheckCircle2, Clock, AlertCircle, Bot, ListTodo, Bell, DollarSign,
  Zap, Shield, TrendingUp, Brain, Globe, FileSearch, Users, Sparkles
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Interfaces
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

interface CostMetrics {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  byAgent: Record<string, { cost: number; tokens: number; requests: number }>;
  byModel: Record<string, { cost: number; tokens: number; requests: number }>;
}

interface BudgetStatus {
  budgetLimit: number;
  currentSpend: number;
  percentUsed: number;
  remaining: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
}

interface PerformanceMetrics {
  totalRequests: number;
  successRate: number;
  latency: { p50: number; p90: number; p95: number; p99: number; avg: number };
  ttft: { p50: number; p90: number; p95: number; p99: number; avg: number };
  byAgent: Record<string, { requests: number; successRate: number; latency: any }>;
}

interface ReliabilityMetrics {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  successRate: number;
  uptime: number;
  mtbf: number;
  recentErrors: Array<{
    timestamp: string;
    agent: string;
    type: string;
    message: string;
  }>;
}

// Agent info with enhanced details
const AGENT_INFO = {
  medha: {
    name: 'Medha',
    fullName: 'Medha — Financial Analyst',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    description: 'Markets analysis, financial forensics, portfolio monitoring, infrastructure sector expertise',
    specialties: ['Portfolio Analysis', 'Financial Forensics', 'Infrastructure Sector', 'Real-time Monitoring']
  },
  hermes: {
    name: 'Hermes',
    fullName: 'Hermes — Research Pipeline',
    icon: Brain,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    description: 'Autonomous research pipeline, wiki management, quarterly updates, competitive intelligence',
    specialties: ['Autonomous Pipeline', 'Wiki Management', 'Quarterly Updates', 'Intelligence']
  },
  zo: {
    name: 'Zo',
    fullName: 'Zo — Research Assistant',
    icon: Globe,
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    description: 'Web research specialist, independent analysis, deep-dive stock research, consultant-style tasks',
    specialties: ['Web Research', 'Deep-Dive Analysis', 'Stock Research', 'On-Demand Tasks']
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [tasks, setTasks] = useState<{ pending: Task[]; inProgress: Task[]; completed: Task[]; failed: Task[] } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Phase 1 metrics
  const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
  const [reliability, setReliability] = useState<ReliabilityMetrics | null>(null);

  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, agentsRes, tasksRes, logsRes, costRes, budgetRes, perfRes, reliabilityRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/agents'),
          fetch('/api/tasks'),
          fetch('/api/logs'),
          fetch('/api/cost'),
          fetch('/api/budget'),
          fetch('/api/performance'),
          fetch('/api/reliability')
        ]);

        const [statsData, agentsData, tasksData, logsData, costData, budgetData, perfData, reliabilityData] = await Promise.all([
          statsRes.json(),
          agentsRes.json(),
          tasksRes.json(),
          logsRes.json(),
          costRes.json(),
          budgetRes.json(),
          perfRes.json(),
          reliabilityRes.json()
        ]);

        setStats(statsData);
        setAgents(agentsData.agents || []);
        setTasks(tasksData);
        setLogs(logsData.logs || []);
        setCostMetrics(costData);
        setBudgetStatus(budgetData);
        setPerfMetrics(perfData);
        setReliability(reliabilityData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
      idle: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
      busy: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    };
    return colors[status as keyof typeof colors] || colors.offline;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
      low: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50"></div>
                <Sparkles className="relative h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Mission Control
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Agentic OS Dashboard v1.1.0</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1 border-green-300 bg-green-50 dark:bg-green-950">
                <Activity className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-700 dark:text-green-300 font-medium">System Online</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tasks</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats?.totalTasks || 0}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{stats?.activeAgents || 0} agents active</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-950">
                  <ListTodo className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-blue-950">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">24h Cost</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">${costMetrics?.totalCost.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{((costMetrics?.totalTokens || 0) / 1000).toFixed(1)}k tokens</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-green-50 dark:from-slate-900 dark:to-green-950">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Success Rate</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{(perfMetrics?.successRate || 0).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">P95: {perfMetrics?.latency.p95 || 0}ms</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-950">
                  <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-amber-950">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Uptime</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{(reliability?.uptime || 0).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">MTBF: {(reliability?.mtbf || 0).toFixed(0)}h</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950">
                  <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Agents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Object.entries(AGENT_INFO).map(([key, info]) => {
            const agent = agents.find(a => a.name.toLowerCase() === key);
            const agentStatus = agent?.status || 'offline';
            const Icon = info.icon;

            return (
              <Card key={key} className={`border-2 ${info.borderColor} hover:shadow-2xl transition-all duration-300 ${info.bgColor} overflow-hidden`}>
                <div className={`h-1 bg-gradient-to-r ${info.color}`}></div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${info.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">{info.fullName}</CardTitle>
                        <Badge className={`mt-1 ${getStatusColor(agentStatus)}`}>
                          {agentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{info.description}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Tasks Completed</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{agent?.tasksCompleted || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">In Progress</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{agent?.tasksInProgress || 0}</span>
                    </div>
                  </div>

                  {agent?.currentTask && (
                    <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Current Task:</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{agent.currentTask}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mt-3">
                    {info.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                    Last active: {agent?.lastActivity || 'N/A'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-950">
              <ListTodo className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="cost" className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-950">
              <DollarSign className="h-4 w-4 mr-2" />
              Cost
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-950">
              <Zap className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="reliability" className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-950">
              <Shield className="h-4 w-4 mr-2" />
              Reliability
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
              <Activity className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Tasks */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Pending ({tasks?.pending.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {tasks?.pending.map(task => (
                        <div key={task.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors bg-white dark:bg-slate-900">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{task.title}</h4>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Bot className="h-3 w-3" />
                            <span>{task.assignedTo}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(task.created).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* In Progress Tasks */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    In Progress ({tasks?.inProgress.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {tasks?.inProgress.map(task => (
                        <div key={task.id} className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{task.title}</h4>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Bot className="h-3 w-3" />
                            <span>{task.assignedTo}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(task.created).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Budget Status</CardTitle>
                  <CardDescription>Daily spend vs budget limit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 dark:text-slate-400">Budget Used</span>
                        <span className="font-semibold">{budgetStatus?.percentUsed.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            (budgetStatus?.percentUsed || 0) > 90
                              ? 'bg-red-500'
                              : (budgetStatus?.percentUsed || 0) > 70
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budgetStatus?.percentUsed || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Current Spend</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          ${budgetStatus?.currentSpend.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${budgetStatus?.remaining.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Cost by Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {costMetrics && Object.entries(costMetrics.byAgent).map(([agent, data]) => {
                      const agentInfo = AGENT_INFO[agent as keyof typeof AGENT_INFO];
                      return (
                        <div key={agent} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${agentInfo?.color || 'from-gray-500 to-gray-600'}`}>
                              {agentInfo && <agentInfo.icon className="h-4 w-4 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                {agentInfo?.name || agent}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {((data.tokens || 0) / 1000).toFixed(1)}k tokens
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            ${(data.cost || 0).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Latency Distribution</CardTitle>
                <CardDescription>Response time percentiles (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">P50</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{perfMetrics?.latency.p50 || 0}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ms</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">P90</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{perfMetrics?.latency.p90 || 0}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ms</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <p className="text-xs text-blue-600 dark:text-blue-400">P95</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{perfMetrics?.latency.p95 || 0}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">ms</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">P99</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{perfMetrics?.latency.p99 || 0}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ms</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{perfMetrics?.latency.avg || 0}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reliability Tab */}
          <TabsContent value="reliability">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 dark:text-slate-400">Success Rate</span>
                        <span className="font-semibold">{reliability?.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${reliability?.successRate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Events</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {reliability?.totalEvents || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Failures</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {reliability?.failureCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {reliability?.recentErrors.map((error, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                          <div className="flex items-start justify-between mb-1">
                            <Badge variant="outline" className="text-xs border-red-300 text-red-700 dark:text-red-300">
                              {error.agent}
                            </Badge>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">{error.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>Recent agent actions and events</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          log.level === 'error'
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                            : log.level === 'warn'
                            ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900'
                            : log.level === 'success'
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.source}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <p>Mission Control Dashboard — Powered by Medha, Hermes & Zo</p>
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
