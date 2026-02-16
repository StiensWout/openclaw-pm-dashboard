/**
 * OpenClaw Notification Service
 * Handles notifications to users via OpenClaw messaging system
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class NotificationService {
  constructor() {
    this.notificationChannel = process.env.OPENCLAW_NOTIFICATION_CHANNEL || 'wout-notifications';
    this.isEnabled = true;
  }

  /**
   * Send a notification to the user via OpenClaw messaging
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} priority - Priority level (low, medium, high, urgent)
   * @param {Object} metadata - Additional metadata
   */
  async notifyUser(title, message, priority = 'medium', metadata = {}) {
    if (!this.isEnabled) {
      console.log('Notifications disabled - would have sent:', { title, message, priority });
      return;
    }

    try {
      const notification = {
        title,
        message,
        priority,
        source: 'openclaw-pm-dashboard',
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          agent: metadata.agent || 'system',
          action_required: metadata.action_required || false
        }
      };

      // Use OpenClaw CLI to send message (assuming openclaw command is available)
      const command = `openclaw message send --channel="${this.notificationChannel}" --priority="${priority}" "${title}: ${message}"`;
      
      console.log(`📤 Sending notification: ${title}`);
      console.log(`   Message: ${message}`);
      console.log(`   Priority: ${priority}`);
      
      try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
          console.warn('Notification warning:', stderr);
        }
        console.log('✅ Notification sent successfully');
        return { success: true, notification };
      } catch (execError) {
        // Fallback: log to console if OpenClaw messaging fails
        console.warn('⚠️  OpenClaw messaging failed, falling back to console logging');
        console.log('📢 NOTIFICATION:', JSON.stringify(notification, null, 2));
        return { success: false, error: execError.message, fallback: true };
      }

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request user input for a decision point
   * @param {string} title - Input request title
   * @param {string} question - The question/prompt for the user
   * @param {Array} options - Available options (optional)
   * @param {Object} context - Context information
   */
  async requestUserInput(title, question, options = [], context = {}) {
    let message = question;
    
    if (options && options.length > 0) {
      message += '\n\nOptions:\n' + options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    }

    if (context.agent) {
      message += `\n\n🤖 Requested by: ${context.agent}`;
    }

    if (context.deadline) {
      message += `\n⏰ Response needed by: ${context.deadline}`;
    }

    return this.notifyUser(
      `🤔 ${title}`,
      message,
      'high',
      {
        ...context,
        action_required: true,
        type: 'user_input_request',
        options
      }
    );
  }

  /**
   * Notify about project milestone completion
   * @param {string} milestone - Milestone name
   * @param {string} agent - Agent that completed the milestone
   * @param {Object} details - Milestone details
   */
  async notifyMilestone(milestone, agent, details = {}) {
    return this.notifyUser(
      `🎯 Milestone Completed`,
      `${milestone} has been completed by ${agent}`,
      'medium',
      {
        agent,
        type: 'milestone_completion',
        milestone,
        ...details
      }
    );
  }

  /**
   * Notify about errors or issues that need attention
   * @param {string} error - Error description
   * @param {string} agent - Agent that encountered the error
   * @param {Object} details - Error details
   */
  async notifyError(error, agent, details = {}) {
    return this.notifyUser(
      `🚨 Error Requires Attention`,
      `${agent} encountered an error: ${error}`,
      'urgent',
      {
        agent,
        type: 'error_notification',
        error,
        ...details
      }
    );
  }

  /**
   * Disable notifications (for testing or maintenance)
   */
  disable() {
    this.isEnabled = false;
    console.log('📴 Notifications disabled');
  }

  /**
   * Enable notifications
   */
  enable() {
    this.isEnabled = true;
    console.log('📱 Notifications enabled');
  }
}

// Export singleton instance
module.exports = new NotificationService();