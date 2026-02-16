import { exec } from 'child_process';
import { promisify } from 'util';
import { OpenClawNotification } from '../types';

const execAsync = promisify(exec);

export class OpenClawMessagingService {
  private static instance: OpenClawMessagingService;
  private enabled: boolean;

  private constructor() {
    this.enabled = process.env.OPENCLAW_NOTIFICATIONS === 'true' || true; // Default to enabled
  }

  public static getInstance(): OpenClawMessagingService {
    if (!OpenClawMessagingService.instance) {
      OpenClawMessagingService.instance = new OpenClawMessagingService();
    }
    return OpenClawMessagingService.instance;
  }

  /**
   * Send a notification to Wout via OpenClaw messaging system
   */
  public async notifyUser(notification: OpenClawNotification): Promise<void> {
    if (!this.enabled) {
      console.log('[OpenClaw] Notifications disabled, skipping:', notification.title);
      return;
    }

    try {
      // Format the notification message
      const messageContent = this.formatNotificationMessage(notification);
      
      // Use OpenClaw CLI to send message
      // Assuming OpenClaw has a CLI interface for sending messages
      const target = notification.target || 'whatsapp'; // Default to WhatsApp channel
      const command = `openclaw message --channel ${target} --message "${messageContent}"`;
      
      console.log(`[OpenClaw] Sending notification via ${target}:`, notification.title);
      
      // Execute the command
      await execAsync(command, { 
        cwd: '/home/wout/.openclaw/workspace',
        timeout: 10000 // 10 second timeout
      });
      
      console.log('[OpenClaw] Notification sent successfully');
      
    } catch (error) {
      console.error('[OpenClaw] Failed to send notification:', error);
      
      // Fallback: Write to a notification file that can be picked up by the main system
      await this.writeNotificationFile(notification);
    }
  }

  /**
   * Notify about agent status changes that require user attention
   */
  public async notifyAgentStatusChange(agentName: string, status: string, details?: string): Promise<void> {
    const notification: OpenClawNotification = {
      type: status === 'error' ? 'error' : 'info',
      title: `Agent Status: ${agentName}`,
      message: `Agent ${agentName} is now ${status}${details ? `: ${details}` : ''}`,
      priority: status === 'error' ? 'high' : 'medium',
      metadata: {
        agentName,
        status,
        timestamp: new Date().toISOString()
      }
    };

    await this.notifyUser(notification);
  }

  /**
   * Notify about project status changes
   */
  public async notifyProjectUpdate(projectName: string, status: string, progress?: number): Promise<void> {
    const notification: OpenClawNotification = {
      type: 'info',
      title: `Project Update: ${projectName}`,
      message: `Project ${projectName} is ${status}${progress !== undefined ? ` (${progress}% complete)` : ''}`,
      priority: status === 'completed' ? 'medium' : 'low',
      metadata: {
        projectName,
        status,
        progress,
        timestamp: new Date().toISOString()
      }
    };

    await this.notifyUser(notification);
  }

  /**
   * Notify about task completion or failures
   */
  public async notifyTaskUpdate(taskTitle: string, status: string, agentName?: string): Promise<void> {
    const notification: OpenClawNotification = {
      type: status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'info',
      title: `Task ${status}: ${taskTitle}`,
      message: `Task "${taskTitle}" ${status}${agentName ? ` by ${agentName}` : ''}`,
      priority: status === 'failed' ? 'high' : 'medium',
      metadata: {
        taskTitle,
        status,
        agentName,
        timestamp: new Date().toISOString()
      }
    };

    await this.notifyUser(notification);
  }

  /**
   * Request user input when agents need guidance
   */
  public async requestUserInput(context: string, question: string, agentName?: string): Promise<void> {
    const notification: OpenClawNotification = {
      type: 'warning',
      title: `Input Needed${agentName ? ` - ${agentName}` : ''}`,
      message: `Context: ${context}\n\nQuestion: ${question}\n\nPlease respond in the OpenClaw dashboard or via chat.`,
      priority: 'high',
      metadata: {
        context,
        question,
        agentName,
        requiresResponse: true,
        timestamp: new Date().toISOString()
      }
    };

    await this.notifyUser(notification);
  }

  /**
   * Notify about system errors or important events
   */
  public async notifySystemEvent(event: string, details: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    const notification: OpenClawNotification = {
      type: severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info',
      title: `System Event: ${event}`,
      message: details,
      priority: severity,
      metadata: {
        event,
        severity,
        timestamp: new Date().toISOString()
      }
    };

    await this.notifyUser(notification);
  }

  /**
   * Format notification for display
   */
  private formatNotificationMessage(notification: OpenClawNotification): string {
    const emoji = this.getEmojiForType(notification.type);
    const priority = notification.priority === 'high' ? '🔥 ' : notification.priority === 'medium' ? '⚡ ' : '';
    
    return `${priority}${emoji} **${notification.title}**\n\n${notification.message}`;
  }

  /**
   * Get appropriate emoji for notification type
   */
  private getEmojiForType(type: string): string {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info':
      default: return 'ℹ️';
    }
  }

  /**
   * Write notification to file as fallback
   */
  private async writeNotificationFile(notification: OpenClawNotification): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const notificationFile = path.join('/home/wout/.openclaw/workspace', 'memory', 'pm-dashboard-notifications.json');
      
      let notifications: OpenClawNotification[] = [];
      
      try {
        const existingData = await fs.readFile(notificationFile, 'utf-8');
        notifications = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
      }
      
      notifications.push({
        ...notification,
        metadata: {
          ...notification.metadata,
          fallbackNotification: true
        }
      });
      
      // Keep only the last 50 notifications
      if (notifications.length > 50) {
        notifications = notifications.slice(-50);
      }
      
      await fs.writeFile(notificationFile, JSON.stringify(notifications, null, 2));
      console.log('[OpenClaw] Notification written to fallback file');
      
    } catch (error) {
      console.error('[OpenClaw] Failed to write notification file:', error);
    }
  }

  /**
   * Test the messaging system
   */
  public async testMessaging(): Promise<boolean> {
    try {
      await this.notifySystemEvent('System Test', 'OpenClaw PM Dashboard messaging test', 'low');
      return true;
    } catch (error) {
      console.error('[OpenClaw] Messaging test failed:', error);
      return false;
    }
  }
}