// Base Agent class for OpenClaw PM Dashboard agents

export interface AgentMessage {
  id: string;
  type: string;
  payload: any;
  sender: string;
  recipient?: string;
  timestamp: Date;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  maxConcurrentTasks: number;
  heartbeatInterval: number;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected isActive: boolean = false;
  protected currentTasks: Set<string> = new Set();
  protected lastActivity: Date = new Date();

  constructor(config: AgentConfig) {
    this.config = config;
  }

  // Abstract methods that must be implemented by subclasses
  abstract initialize(): Promise<void>;
  abstract execute(task: any): Promise<any>;
  abstract handleMessage(message: AgentMessage): Promise<void>;
  abstract cleanup(): Promise<void>;

  // Common methods available to all agents
  public getId(): string {
    return this.config.id;
  }

  public getName(): string {
    return this.config.name;
  }

  public getType(): string {
    return this.config.type;
  }

  public getStatus() {
    return {
      id: this.config.id,
      name: this.config.name,
      type: this.config.type,
      isActive: this.isActive,
      currentTaskCount: this.currentTasks.size,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      lastActivity: this.lastActivity,
      capabilities: this.config.capabilities
    };
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();
      this.isActive = true;
      this.updateActivity();
      console.log(`Agent ${this.config.name} started successfully`);
    } catch (error) {
      console.error(`Failed to start agent ${this.config.name}:`, error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.isActive = false;
      await this.cleanup();
      console.log(`Agent ${this.config.name} stopped successfully`);
    } catch (error) {
      console.error(`Error stopping agent ${this.config.name}:`, error);
      throw error;
    }
  }

  public canAcceptTask(): boolean {
    return this.isActive && this.currentTasks.size < this.config.maxConcurrentTasks;
  }

  protected updateActivity(): void {
    this.lastActivity = new Date();
  }

  protected addTask(taskId: string): void {
    this.currentTasks.add(taskId);
    this.updateActivity();
  }

  protected removeTask(taskId: string): void {
    this.currentTasks.delete(taskId);
    this.updateActivity();
  }
}