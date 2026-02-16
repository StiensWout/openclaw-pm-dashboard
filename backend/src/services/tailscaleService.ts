import { exec } from 'child_process';
import { promisify } from 'util';
import { TailscaleConfig } from '../types';

const execAsync = promisify(exec);

export class TailscaleService {
  private config: TailscaleConfig;

  constructor() {
    this.config = {
      interface: process.env.TAILSCALE_INTERFACE || 'hostingervps.barracuda-banfish.ts.net',
      hostname: process.env.TAILSCALE_INTERFACE || 'hostingervps.barracuda-banfish.ts.net',
      port: parseInt(process.env.PORT || '3001'),
      enabled: process.env.TAILSCALE_ONLY === 'true' || true
    };
  }

  /**
   * Get Tailscale status
   */
  public async getDetailedStatus(): Promise<any> {
    try {
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);
      
      return {
        connected: status.BackendState === 'Running',
        hostname: this.config.hostname,
        self: status.Self,
        peers: status.Peer ? Object.keys(status.Peer).length : 0,
        backendState: status.BackendState,
        config: this.config
      };
    } catch (error) {
      console.warn('Failed to get Tailscale status:', error);
      return {
        connected: false,
        hostname: this.config.hostname,
        error: 'Failed to get Tailscale status',
        config: this.config
      };
    }
  }

  /**
   * Get simple status for health checks
   */
  public getStatus(): { enabled: boolean; hostname: string } {
    return {
      enabled: this.config.enabled,
      hostname: this.config.hostname
    };
  }

  /**
   * Get the Tailscale URL for the service
   */
  public getTailscaleUrl(port?: number): string {
    const servicePort = port || this.config.port;
    return `https://${this.config.hostname}:${servicePort}`;
  }

  /**
   * Check if the current host is accessible via Tailscale
   */
  public async isAccessibleViaTailscale(): Promise<boolean> {
    try {
      // Try to ping the Tailscale interface
      await execAsync(`ping -c 1 -W 1 ${this.config.hostname}`);
      return true;
    } catch (error) {
      console.warn('Tailscale interface not reachable:', error);
      return false;
    }
  }

  /**
   * Get network interface information
   */
  public async getNetworkInfo(): Promise<any> {
    try {
      // Get all network interfaces
      const { stdout: ifconfigOut } = await execAsync('ip addr show');
      
      // Get routing information
      const { stdout: routeOut } = await execAsync('ip route show');
      
      // Look for Tailscale interface
      const tailscaleMatch = ifconfigOut.match(/tailscale\d+/);
      const hasTailscaleInterface = tailscaleMatch !== null;
      
      return {
        hasTailscaleInterface,
        interfaces: ifconfigOut.split('\n').filter(line => line.includes('inet ')),
        routes: routeOut.split('\n').filter(line => line.trim()),
        hostname: this.config.hostname
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return {
        error: 'Failed to get network information',
        hostname: this.config.hostname
      };
    }
  }

  /**
   * Validate that the server should only be accessible via Tailscale
   */
  public async validateTailscaleOnlyAccess(): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    try {
      // Check if we're binding to all interfaces when we should be Tailscale-only
      const bindHost = process.env.BIND_HOST || '0.0.0.0';
      if (this.config.enabled && bindHost === '0.0.0.0') {
        warnings.push('Server is binding to all interfaces (0.0.0.0) but Tailscale-only mode is enabled');
      }

      // Check if Tailscale is running
      const status = await this.getDetailedStatus();
      if (this.config.enabled && !status.connected) {
        warnings.push('Tailscale-only mode is enabled but Tailscale is not running');
      }

      // Check for public network interfaces
      const networkInfo = await this.getNetworkInfo();
      const publicInterfaces = networkInfo.interfaces?.filter((iface: string) => 
        iface.includes('inet ') && 
        !iface.includes('127.0.0.1') && 
        !iface.includes('192.168.') && 
        !iface.includes('10.') && 
        !iface.includes('172.')
      ) || [];

      if (this.config.enabled && publicInterfaces.length > 0) {
        warnings.push('Public network interfaces detected while in Tailscale-only mode');
      }

      return {
        valid: warnings.length === 0,
        warnings
      };
    } catch (error) {
      warnings.push(`Failed to validate Tailscale configuration: ${error}`);
      return {
        valid: false,
        warnings
      };
    }
  }

  /**
   * Get recommended binding configuration for Tailscale
   */
  public getRecommendedBindConfig(): { host: string; port: number; url: string } {
    // In Tailscale-only mode, we can bind to 0.0.0.0 since Tailscale handles the network isolation
    // But for extra security, we could bind to the specific Tailscale IP
    const host = this.config.enabled ? '0.0.0.0' : '127.0.0.1';
    const port = this.config.port;
    const url = this.getTailscaleUrl(port);

    return { host, port, url };
  }

  /**
   * Log Tailscale configuration on startup
   */
  public async logStartupInfo(): Promise<void> {
    console.log('🔗 Tailscale Configuration:');
    console.log(`   Enabled: ${this.config.enabled}`);
    console.log(`   Hostname: ${this.config.hostname}`);
    console.log(`   URL: ${this.getTailscaleUrl()}`);

    if (this.config.enabled) {
      const status = await this.getDetailedStatus();
      console.log(`   Status: ${status.connected ? '✅ Connected' : '❌ Disconnected'}`);
      
      if (status.connected) {
        console.log(`   Backend State: ${status.backendState}`);
        console.log(`   Peers: ${status.peers}`);
      }

      // Validate configuration
      const validation = await this.validateTailscaleOnlyAccess();
      if (!validation.valid) {
        console.warn('⚠️  Tailscale Configuration Warnings:');
        validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
      }
    }
  }

  /**
   * Setup Tailscale serve (optional - for easier access)
   */
  public async setupTailscaleServe(port: number): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Use Tailscale serve to expose the service
      const command = `tailscale serve --bg --https=${port} http://localhost:${port}`;
      await execAsync(command);
      
      console.log(`✅ Tailscale serve configured for port ${port}`);
      return true;
    } catch (error) {
      console.warn('Failed to setup Tailscale serve:', error);
      return false;
    }
  }

  /**
   * Stop Tailscale serve
   */
  public async stopTailscaleServe(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await execAsync('tailscale serve --reset');
      console.log('✅ Tailscale serve reset');
    } catch (error) {
      console.warn('Failed to reset Tailscale serve:', error);
    }
  }
}