#!/bin/bash

# OpenClaw PM Dashboard - Health Check Script
# Verifies both development and production environments

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/deploy/logs"

echo "🏥 OpenClaw PM Dashboard - Health Check"
echo "========================================"

# Function to check service health
check_service() {
    local name=$1
    local port=$2
    local endpoint=$3
    local env=$4
    
    echo ""
    echo "🔍 Checking $name ($env) on port $port..."
    
    # Check if port is listening
    if lsof -i :$port > /dev/null 2>&1; then
        echo "  ✅ Port $port is listening"
        
        # Check HTTP response
        if curl -s --connect-timeout 5 --max-time 10 "$endpoint" > /dev/null; then
            echo "  ✅ HTTP response OK"
            
            # Get response details
            response_time=$(curl -s -o /dev/null -w "%{time_total}" "$endpoint")
            http_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
            echo "  📊 Response time: ${response_time}s"
            echo "  📊 HTTP code: $http_code"
            
            return 0
        else
            echo "  ❌ HTTP request failed"
            return 1
        fi
    else
        echo "  ❌ Port $port is not listening"
        return 1
    fi
}

# Function to check log files
check_logs() {
    local env=$1
    echo ""
    echo "📋 Recent log entries ($env):"
    
    if [ -f "$LOG_DIR/backend-$env.log" ]; then
        echo "  Backend log (last 3 lines):"
        tail -3 "$LOG_DIR/backend-$env.log" | sed 's/^/    /'
    else
        echo "  ❌ No backend log found"
    fi
    
    if [ -f "$LOG_DIR/frontend-$env.log" ]; then
        echo "  Frontend log (last 3 lines):"
        tail -3 "$LOG_DIR/frontend-$env.log" | sed 's/^/    /'
    else
        echo "  ❌ No frontend log found"
    fi
}

# Function to check system resources
check_resources() {
    echo ""
    echo "💻 System Resources:"
    echo "  Memory usage: $(free -h | awk '/^Mem:/ {print $3"/"$2}')"
    echo "  Disk usage: $(df -h / | awk 'NR==2 {print $3"/"$2" ("$5" used)"}')"
    echo "  CPU load: $(uptime | awk -F'load average:' '{print $2}')"
}

# Check OpenClaw Gateway (should not interfere)
echo ""
echo "🔒 OpenClaw Gateway Status:"
if lsof -i :18789 > /dev/null 2>&1; then
    echo "  ✅ OpenClaw Gateway running on port 18789"
else
    echo "  ⚠️  OpenClaw Gateway not detected on port 18789"
fi

# Development Environment Check
echo ""
echo "🔧 DEVELOPMENT ENVIRONMENT"
echo "=========================="

dev_backend_healthy=false
dev_frontend_healthy=false

if check_service "Backend API" "3001" "http://localhost:3001/health" "dev"; then
    dev_backend_healthy=true
fi

if check_service "Frontend" "3000" "http://localhost:3000" "dev"; then
    dev_frontend_healthy=true
fi

if [ "$dev_backend_healthy" = true ] || [ "$dev_frontend_healthy" = true ]; then
    check_logs "dev"
fi

# Production Environment Check  
echo ""
echo "🚀 PRODUCTION ENVIRONMENT"
echo "========================="

prod_backend_healthy=false
prod_frontend_healthy=false

if check_service "Backend API" "4001" "http://localhost:4001/health" "prod"; then
    prod_backend_healthy=true
fi

if check_service "Frontend" "4000" "http://localhost:4000" "prod"; then
    prod_frontend_healthy=true
fi

if [ "$prod_backend_healthy" = true ] || [ "$prod_frontend_healthy" = true ]; then
    check_logs "prod"
fi

# Tailscale connectivity check
echo ""
echo "🌐 Tailscale Connectivity:"
if command -v tailscale >/dev/null 2>&1; then
    if tailscale status | grep -q "hostingervps.barracuda-banfish.ts.net"; then
        echo "  ✅ Tailscale connected"
        echo "  📡 External URLs:"
        if [ "$dev_frontend_healthy" = true ]; then
            echo "    Dev:  https://hostingervps.barracuda-banfish.ts.net:3000"
        fi
        if [ "$prod_frontend_healthy" = true ]; then
            echo "    Prod: https://hostingervps.barracuda-banfish.ts.net:4000"
        fi
    else
        echo "  ❌ Tailscale not connected or hostname not found"
    fi
else
    echo "  ⚠️  Tailscale command not found"
fi

# System resources
check_resources

# Summary
echo ""
echo "📊 HEALTH SUMMARY"
echo "================="

total_services=0
healthy_services=0

if [ "$dev_backend_healthy" = true ]; then
    echo "✅ Development Backend (port 3001)"
    ((healthy_services++))
fi
((total_services++))

if [ "$dev_frontend_healthy" = true ]; then
    echo "✅ Development Frontend (port 3000)"
    ((healthy_services++))
fi
((total_services++))

if [ "$prod_backend_healthy" = true ]; then
    echo "✅ Production Backend (port 4001)"
    ((healthy_services++))
fi
((total_services++))

if [ "$prod_frontend_healthy" = true ]; then
    echo "✅ Production Frontend (port 4000)"
    ((healthy_services++))
fi
((total_services++))

echo ""
echo "🎯 Overall Status: $healthy_services/$total_services services healthy"

if [ $healthy_services -eq 0 ]; then
    echo "❌ No services are running"
    exit 1
elif [ $healthy_services -eq $total_services ]; then
    echo "🎉 All services are healthy!"
    exit 0
else
    echo "⚠️  Some services need attention"
    exit 2
fi