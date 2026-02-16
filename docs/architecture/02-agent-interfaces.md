# Agent Interface Definitions

## Base Agent Interface

### IAgent (Base Interface)

```typescript
interface IAgent {
  // Agent Identity
  readonly id: string;
  readonly type: AgentType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: AgentCapability[];
  
  // Lifecycle Management
  initialize(config: AgentConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  healthCheck(): Promise<AgentHealth>;
  
  // Message Handling
  handleMessage(message: AgentMessage): Promise<AgentResponse>;
  sendMessage(targetId: string, message: AgentMessage): Promise<void>;
  broadcast(message: AgentMessage, filter?: AgentFilter): Promise<void>;
  
  // State Management
  getState(): Promise<AgentState>;
  setState(state: Partial<AgentState>): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  
  // Task Management
  executeTask(task: AgentTask): Promise<TaskResult>;
  cancelTask(taskId: string): Promise<void>;
  getActiveTasks(): Promise<AgentTask[]>;
}
```

### Supporting Types

```typescript
enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  PLANNING = 'planning',
  TASK = 'task',
  PROGRESS = 'progress',
  COMMUNICATION = 'communication',
  RESOURCE = 'resource'
}

enum AgentCapability {
  PLANNING = 'planning',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
  COMMUNICATION = 'communication',
  ANALYSIS = 'analysis',
  COORDINATION = 'coordination',
  SCHEDULING = 'scheduling',
  REPORTING = 'reporting'
}

interface AgentConfig {
  maxConcurrentTasks: number;
  messageQueueSize: number;
  heartbeatInterval: number;
  timeoutDuration: number;
  retryPolicy: RetryPolicy;
  logging: LoggingConfig;
  integrations: IntegrationConfig;
}

interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: number;
  activeTasks: number;
  messageQueueLength: number;
  lastHeartbeat: Date;
  errors: AgentError[];
}

interface AgentState {
  id: string;
  status: AgentStatus;
  metadata: Record<string, any>;
  lastUpdated: Date;
  version: number;
}

enum AgentStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  BUSY = 'busy',
  PAUSED = 'paused',
  ERROR = 'error',
  TERMINATING = 'terminating'
}
```

## Specialized Agent Interfaces

### IOrchestratorAgent

```typescript
interface IOrchestratorAgent extends IAgent {
  // Agent Management
  spawnAgent(type: AgentType, config?: AgentConfig): Promise<string>;
  terminateAgent(agentId: string, reason?: string): Promise<void>;
  getAgentRegistry(): Promise<AgentRegistry>;
  
  // Task Orchestration
  delegateTask(task: OrchestratorTask): Promise<TaskDelegation>;
  coordinateWorkflow(workflow: Workflow): Promise<WorkflowResult>;
  balanceLoad(): Promise<LoadBalanceResult>;
  
  // System Management
  getSystemHealth(): Promise<SystemHealth>;
  performRecovery(strategy: RecoveryStrategy): Promise<void>;
  optimizePerformance(): Promise<OptimizationResult>;
  
  // Integration Management
  integrateTool(tool: ExternalTool): Promise<void>;
  syncWithOpenClaw(): Promise<SyncResult>;
}

interface AgentRegistry {
  agents: RegisteredAgent[];
  capabilities: CapabilityMap;
  workload: WorkloadDistribution;
  performance: PerformanceMetrics;
}

interface TaskDelegation {
  taskId: string;
  assignedAgent: string;
  estimatedCompletion: Date;
  dependencies: string[];
  priority: TaskPriority;
}
```

### IPlanningAgent

```typescript
interface IPlanningAgent extends IAgent {
  // Project Planning
  createProjectPlan(requirements: ProjectRequirements): Promise<ProjectPlan>;
  decomposeProject(project: Project): Promise<TaskBreakdown>;
  estimateEffort(tasks: Task[]): Promise<EffortEstimate>;
  
  // Timeline Management
  createTimeline(tasks: Task[], constraints: Constraint[]): Promise<Timeline>;
  optimizeSchedule(timeline: Timeline): Promise<Timeline>;
  identifyCriticalPath(timeline: Timeline): Promise<CriticalPath>;
  
  // Resource Planning
  analyzeResourceNeeds(plan: ProjectPlan): Promise<ResourceRequirements>;
  allocateResources(requirements: ResourceRequirements): Promise<ResourceAllocation>;
  
  // GSD Integration
  applyGSDFramework(project: Project): Promise<GSDPlan>;
  validateGSDCompliance(plan: ProjectPlan): Promise<ComplianceReport>;
}

interface ProjectPlan {
  id: string;
  name: string;
  description: string;
  phases: ProjectPhase[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  timeline: Timeline;
  resources: ResourceAllocation;
  risks: Risk[];
  gsdCompliant: boolean;
}

interface TaskBreakdown {
  rootTask: Task;
  subtasks: Task[];
  dependencies: TaskDependency[];
  estimates: EffortEstimate;
}
```

### ITaskAgent

```typescript
interface ITaskAgent extends IAgent {
  // Task Management
  createTask(definition: TaskDefinition): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  assignTask(taskId: string, assigneeId: string): Promise<void>;
  
  // Status Management
  updateStatus(taskId: string, status: TaskStatus): Promise<void>;
  addProgress(taskId: string, progress: ProgressUpdate): Promise<void>;
  setDeadline(taskId: string, deadline: Date): Promise<void>;
  
  // Dependency Management
  addDependency(taskId: string, dependsOn: string): Promise<void>;
  removeDependency(taskId: string, dependsOn: string): Promise<void>;
  checkDependencies(taskId: string): Promise<DependencyStatus>;
  
  // Integration
  syncWithExternalTools(): Promise<SyncResult>;
  importTasks(source: TaskImportSource): Promise<ImportResult>;
  exportTasks(format: ExportFormat): Promise<ExportResult>;
}

enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked'
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  creator: string;
  deadline?: Date;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}
```

### IProgressAgent

```typescript
interface IProgressAgent extends IAgent {
  // Progress Tracking
  trackProgress(projectId: string): Promise<ProgressReport>;
  calculateVelocity(teamId: string, period: TimePeriod): Promise<VelocityMetrics>;
  predictCompletion(projectId: string): Promise<CompletionPrediction>;
  
  // Metrics Collection
  collectMetrics(): Promise<ProjectMetrics>;
  generateKPIs(projectId: string): Promise<KPI[]>;
  analyzePerformance(period: TimePeriod): Promise<PerformanceAnalysis>;
  
  // Alerting
  monitorDeadlines(): Promise<DeadlineAlert[]>;
  detectBottlenecks(): Promise<Bottleneck[]>;
  identifyRisks(): Promise<Risk[]>;
  
  // Reporting
  generateDashboard(projectId: string): Promise<DashboardData>;
  createStatusReport(projectId: string): Promise<StatusReport>;
  exportMetrics(format: ReportFormat): Promise<ExportResult>;
}

interface ProgressReport {
  projectId: string;
  overallProgress: number; // 0-100%
  taskProgress: TaskProgressSummary[];
  milestoneStatus: MilestoneStatus[];
  velocity: VelocityMetrics;
  burndown: BurndownData;
  risks: Risk[];
  recommendations: Recommendation[];
  generatedAt: Date;
}
```

### ICommunicationAgent

```typescript
interface ICommunicationAgent extends IAgent {
  // Notification Management
  sendNotification(notification: Notification): Promise<void>;
  scheduleNotification(notification: Notification, schedule: Schedule): Promise<string>;
  cancelNotification(notificationId: string): Promise<void>;
  
  // Report Distribution
  distributeReport(report: Report, recipients: Recipient[]): Promise<DistributionResult>;
  scheduleReports(schedule: ReportSchedule): Promise<void>;
  
  // Meeting Management
  scheduleMeeting(meeting: MeetingRequest): Promise<MeetingResult>;
  sendMeetingReminders(meetingId: string): Promise<void>;
  cancelMeeting(meetingId: string, reason?: string): Promise<void>;
  
  // OpenClaw Integration
  sendOpenClawMessage(message: OpenClawMessage): Promise<void>;
  receiveOpenClawMessage(message: OpenClawMessage): Promise<void>;
  syncUserPreferences(): Promise<UserPreferences>;
  
  // External Integrations
  sendEmail(email: EmailMessage): Promise<void>;
  sendSlackMessage(message: SlackMessage): Promise<void>;
  updateCalendar(event: CalendarEvent): Promise<void>;
}

interface Notification {
  id?: string;
  type: NotificationType;
  recipient: string;
  title: string;
  message: string;
  priority: Priority;
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
}

enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  DEADLINE_APPROACHING = 'deadline_approaching',
  PROJECT_COMPLETED = 'project_completed',
  STATUS_UPDATE = 'status_update',
  SYSTEM_ALERT = 'system_alert'
}
```

### IResourceAgent

```typescript
interface IResourceAgent extends IAgent {
  // Resource Management
  allocateResource(allocation: ResourceAllocation): Promise<AllocationResult>;
  deallocateResource(resourceId: string, reason?: string): Promise<void>;
  checkAvailability(resourceId: string, period: TimePeriod): Promise<AvailabilityStatus>;
  
  // Capacity Planning
  planCapacity(requirements: CapacityRequirements): Promise<CapacityPlan>;
  foreccastUsage(period: TimePeriod): Promise<UsageForecast>;
  optimizeAllocation(constraints: AllocationConstraint[]): Promise<OptimizationResult>;
  
  // Budget Management
  trackBudget(projectId: string): Promise<BudgetStatus>;
  analyzeCosts(period: TimePeriod): Promise<CostAnalysis>;
  generateBudgetReport(projectId: string): Promise<BudgetReport>;
  
  // Team Management
  balanceWorkload(teamId: string): Promise<WorkloadBalance>;
  assignTeamMember(taskId: string, memberId: string): Promise<AssignmentResult>;
  trackUtilization(memberId: string): Promise<UtilizationMetrics>;
}

interface ResourceAllocation {
  resourceId: string;
  projectId: string;
  taskId?: string;
  startDate: Date;
  endDate: Date;
  allocation: number; // percentage (0-100)
  cost?: number;
  notes?: string;
}
```

## Event System

### Event Types

```typescript
interface AgentEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

enum EventType {
  // Agent Events
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped',
  AGENT_ERROR = 'agent.error',
  
  // Task Events
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_COMPLETED = 'task.completed',
  TASK_CANCELLED = 'task.cancelled',
  
  // Project Events
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_COMPLETED = 'project.completed',
  
  // System Events
  SYSTEM_HEALTH = 'system.health',
  SYSTEM_ALERT = 'system.alert',
  SYSTEM_RECOVERY = 'system.recovery'
}

interface EventHandler {
  (event: AgentEvent): Promise<void>;
}
```

## Error Handling

### Error Types

```typescript
class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly agentId: string,
    public readonly recoverable: boolean = false,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

enum ErrorCode {
  INITIALIZATION_FAILED = 'INIT_FAILED',
  COMMUNICATION_ERROR = 'COMM_ERROR',
  TASK_EXECUTION_ERROR = 'TASK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  INVALID_STATE = 'INVALID_STATE',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR'
}

interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  retryableErrors: ErrorCode[];
}
```

## Configuration Interfaces

```typescript
interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'elasticsearch';
  includeStackTrace: boolean;
}

interface IntegrationConfig {
  openClaw: OpenClawConfig;
  databases: DatabaseConfig[];
  messageBus: MessageBusConfig;
  externalTools: ExternalToolConfig[];
}

interface OpenClawConfig {
  endpoint: string;
  apiKey: string;
  messageChannels: string[];
  userContext: boolean;
  toolAccess: string[];
}
```

This interface specification provides the foundation for implementing all agents in the system with consistent contracts and clear responsibilities.