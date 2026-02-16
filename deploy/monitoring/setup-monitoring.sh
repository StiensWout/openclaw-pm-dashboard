#!/bin/bash

# OpenClaw PM Dashboard - Setup Monitoring System
# Automated health checks and restart capabilities

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$PROJECT_DIR/deploy"
MONITORING_DIR="$DEPLOY_DIR/monitoring"
LOG_DIR="$DEPLOY_DIR/logs"

mkdir -p "$LOG_DIR/monitoring"

echo "📊 Setting up OpenClaw PM Dashboard Monitoring System"

# Create monitoring configuration
cat > "$MONITORING_DIR/config.json" << 'EOF'
{
  "monitoring": {
    "enabled": true,
    "interval_seconds": 30,
    "restart_on_failure": true,
    "max_restart_attempts": 3,
    "restart_cooldown_minutes": 5
  },
  "services": {
    "dev_backend": {
      "port": 3001,
      "health_endpoint": "http://localhost:3001/health",
      "restart_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/dev-start.sh --background",
      "stop_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/dev-stop.sh"
    },
    "dev_frontend": {
      "port": 3000,
      "health_endpoint": "http://localhost:3000",
      "restart_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/dev-start.sh --background",
      "stop_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/dev-stop.sh"
    },
    "prod_backend": {
      "port": 4001,
      "health_endpoint": "http://localhost:4001/health",
      "restart_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/prod-deploy.sh",
      "stop_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/prod-stop.sh"
    },
    "prod_frontend": {
      "port": 4000,
      "health_endpoint": "http://localhost:4000",
      "restart_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/prod-deploy.sh",
      "stop_command": "cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard && ./deploy/scripts/prod-stop.sh"
    }
  },
  "notifications": {
    "enabled": true,
    "webhook_url": "",
    "notify_on_failure": true,
    "notify_on_restart": true,
    "notify_on_recovery": true
  }
}
EOF

# Create the monitoring daemon script
cat > "$MONITORING_DIR/health-monitor.sh" << 'EOF'
#!/bin/bash

# OpenClaw PM Dashboard - Health Monitoring Daemon

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MONITORING_DIR="$PROJECT_DIR/deploy/monitoring"
LOG_DIR="$PROJECT_DIR/deploy/logs/monitoring"
CONFIG_FILE="$MONITORING_DIR/config.json"
STATE_FILE="$MONITORING_DIR/monitor-state.json"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Initialize state file if it doesn't exist
if [ ! -f "$STATE_FILE" ]; then
    echo '{"services": {}}' > "$STATE_FILE"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/health-monitor.log"
}

# Function to check if service is healthy
check_service_health() {
    local service=$1
    local port=$2
    local endpoint=$3
    
    # Check if port is listening
    if ! lsof -i :$port > /dev/null 2>&1; then
        return 1
    fi
    
    # Check HTTP response
    if curl -s --connect-timeout 5 --max-time 10 "$endpoint" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to restart service
restart_service() {
    local service=$1
    local restart_cmd=$2
    
    log "🔄 Attempting to restart $service..."
    
    # Execute restart command
    if eval "$restart_cmd" >> "$LOG_DIR/restart-$service.log" 2>&1; then
        log "✅ Successfully restarted $service"
        return 0
    else
        log "❌ Failed to restart $service"
        return 1
    fi
}

# Function to update service state
update_service_state() {
    local service=$1
    local status=$2
    local restart_count=${3:-0}
    local last_restart=${4:-null}
    
    # Read current state
    local current_state=$(cat "$STATE_FILE")
    
    # Update state using jq (if available) or simple JSON manipulation
    if command -v jq >/dev/null 2>&1; then
        echo "$current_state" | jq ".services[\"$service\"] = {\"status\": \"$status\", \"restart_count\": $restart_count, \"last_restart\": \"$last_restart\", \"last_check\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$STATE_FILE"
    else
        # Fallback without jq
        local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        local temp_state=$(mktemp)
        echo "$current_state" | sed "s/\"services\":{/\"services\":{\"$service\":{\"status\":\"$status\",\"restart_count\":$restart_count,\"last_restart\":\"$last_restart\",\"last_check\":\"$timestamp\"},/" > "$temp_state"
        mv "$temp_state" "$STATE_FILE"
    fi
}

# Main monitoring loop
log "🚀 Starting OpenClaw PM Dashboard Health Monitor"

while true; do
    # Get current timestamp
    current_time=$(date +%s)
    
    # Check each service
    services=("dev_backend:3001:http://localhost:3001/health" "dev_frontend:3000:http://localhost:3000" "prod_backend:4001:http://localhost:4001/health" "prod_frontend:4000:http://localhost:4000")
    
    for service_config in "${services[@]}"; do
        IFS=':' read -r service port endpoint <<< "$service_config"
        
        if check_service_health "$service" "$port" "$endpoint"; then
            update_service_state "$service" "healthy"
        else
            log "⚠️  Service $service is unhealthy (port $port)"
            
            # Get restart count from state
            restart_count=0
            if [ -f "$STATE_FILE" ]; then
                if command -v jq >/dev/null 2>&1; then
                    restart_count=$(cat "$STATE_FILE" | jq -r ".services[\"$service\"].restart_count // 0")
                fi
            fi
            
            # Check if we should attempt restart
            if [ $restart_count -lt 3 ]; then
                case $service in
                    "dev_backend"|"dev_frontend")
                        restart_cmd="cd $PROJECT_DIR && ./deploy/scripts/dev-start.sh --background"
                        ;;
                    "prod_backend"|"prod_frontend")
                        restart_cmd="cd $PROJECT_DIR && ./deploy/scripts/prod-deploy.sh"
                        ;;
                esac
                
                if restart_service "$service" "$restart_cmd"; then
                    new_count=$((restart_count + 1))
                    update_service_state "$service" "restarted" "$new_count" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
                else
                    update_service_state "$service" "failed" "$restart_count"
                fi
            else
                log "❌ Service $service has exceeded maximum restart attempts"
                update_service_state "$service" "failed" "$restart_count"
            fi
        fi
    done
    
    # Wait for next check
    sleep 30
done
EOF

chmod +x "$MONITORING_DIR/health-monitor.sh"

# Create monitoring control script
cat > "$MONITORING_DIR/monitor-control.sh" << 'EOF'
#!/bin/bash

# OpenClaw PM Dashboard - Monitoring Control Script

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MONITORING_DIR="$PROJECT_DIR/deploy/monitoring"
LOG_DIR="$PROJECT_DIR/deploy/logs/monitoring"
PID_FILE="$MONITORING_DIR/health-monitor.pid"

case "$1" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Health monitor is already running (PID: $(cat $PID_FILE))"
            exit 1
        fi
        
        echo "Starting health monitor..."
        nohup "$MONITORING_DIR/health-monitor.sh" > "$LOG_DIR/health-monitor.log" 2>&1 &
        echo $! > "$PID_FILE"
        echo "Health monitor started (PID: $!)"
        ;;
        
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                rm -f "$PID_FILE"
                echo "Health monitor stopped"
            else
                echo "Health monitor was not running"
                rm -f "$PID_FILE"
            fi
        else
            echo "No PID file found"
        fi
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Health monitor is running (PID: $(cat $PID_FILE))"
            
            # Show recent state if available
            if [ -f "$MONITORING_DIR/monitor-state.json" ]; then
                echo "Recent service states:"
                if command -v jq >/dev/null 2>&1; then
                    cat "$MONITORING_DIR/monitor-state.json" | jq '.services'
                else
                    echo "Install jq for detailed state information"
                fi
            fi
        else
            echo "Health monitor is not running"
        fi
        ;;
        
    logs)
        if [ -f "$LOG_DIR/health-monitor.log" ]; then
            tail -f "$LOG_DIR/health-monitor.log"
        else
            echo "No monitor logs found"
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

chmod +x "$MONITORING_DIR/monitor-control.sh"

# Start the monitoring system
echo "🔄 Starting health monitoring system..."
"$MONITORING_DIR/monitor-control.sh" start

echo ""
echo "✅ Monitoring system setup complete!"
echo ""
echo "📊 Monitoring Commands:"
echo "  Start:   $MONITORING_DIR/monitor-control.sh start"
echo "  Stop:    $MONITORING_DIR/monitor-control.sh stop"
echo "  Status:  $MONITORING_DIR/monitor-control.sh status"
echo "  Logs:    $MONITORING_DIR/monitor-control.sh logs"
echo ""
echo "📁 Log files:"
echo "  Monitor: $LOG_DIR/health-monitor.log"
echo "  State:   $MONITORING_DIR/monitor-state.json"