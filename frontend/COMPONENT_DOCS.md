# Component Documentation

## 📋 Overview

This document provides detailed information about the React components in the OpenClaw Multi-Agent Dashboard frontend.

## 🏗️ Component Architecture

```
App.tsx (Router + State Management)
├── Layout.tsx (Navigation + Structure)
└── Dashboard.tsx (Main Orchestrator)
    ├── AgentStatusDashboard.tsx
    ├── MessagePanel.tsx  
    ├── KanbanBoard.tsx
    ├── AgentMetrics.tsx
    └── TaskAssignment.tsx (Modal)
```

## 📦 Component Details

### Layout.tsx
**Purpose:** Provides the main application structure with navigation sidebar and header.

**Key Features:**
- Collapsible sidebar navigation
- Active navigation state management
- OpenClaw branding and status indicators
- Responsive design for mobile/desktop

**Props:**
```typescript
interface LayoutProps {
  children: React.ReactNode
}
```

### Dashboard.tsx  
**Purpose:** Main orchestrator component that manages application state and routing.

**Key Features:**
- WebSocket connection management
- Real-time state updates
- Route-based view rendering
- System status overview cards

**Props:**
```typescript
interface DashboardProps {
  activeView?: 'overview' | 'agents' | 'projects' | 'messages' | 'metrics'
}
```

### AgentStatusDashboard.tsx
**Purpose:** Real-time agent monitoring with status cards and performance metrics.

**Key Features:**
- Agent status indicators (online/offline/working/error)
- Performance metrics display
- Capability badges
- Interactive agent selection
- Last active timestamps

**Props:**
```typescript
interface AgentStatusDashboardProps {
  agents: Agent[]
  onAgentSelect?: (agent: Agent) => void
}
```

**State Management:**
- Selected agent tracking
- Real-time status updates via WebSocket

### MessagePanel.tsx
**Purpose:** Real-time communication center for agent messages and system notifications.

**Key Features:**
- Message type filtering (agent-to-agent, system, error, etc.)
- Search functionality
- Auto-scroll to latest messages
- Message metadata display
- Severity indicators

**Props:**
```typescript
interface MessagePanelProps {
  messages: Message[]
  onMessageSelect?: (message: Message) => void
  className?: string
}
```

**State Management:**
- Message filtering by type and search term
- Filter toggle visibility

### KanbanBoard.tsx
**Purpose:** Interactive project management with drag-and-drop task organization.

**Key Features:**
- Drag & drop task movement
- Status columns (To Do, In Progress, Review, Done)
- Task priority indicators
- Assignee information
- Time tracking
- Tag system

**Props:**
```typescript
interface KanbanBoardProps {
  tasks?: Task[]
  agents?: Agent[]
  onTaskUpdate?: (task: Task) => void
  onTaskCreate?: (task: Omit<Task, 'id'>) => void
}
```

**State Management:**
- Kanban column organization
- Drag state tracking
- Task status updates

### TaskAssignment.tsx
**Purpose:** Modal interface for creating and assigning new tasks to agents.

**Key Features:**
- Form validation with error handling
- Agent capability matching
- Priority and due date setting
- Tag input with comma separation
- Agent availability filtering

**Props:**
```typescript
interface TaskAssignmentProps {
  agents: Agent[]
  onTaskAssign?: (task: Omit<Task, 'id'>, agentId: string) => void
  isOpen: boolean
  onClose: () => void
}
```

**State Management:**
- Form data validation
- Agent selection logic
- Error state management

### AgentMetrics.tsx
**Purpose:** Performance analytics and monitoring charts for agent health.

**Key Features:**
- Response time charts
- CPU and memory usage graphs
- Task queue monitoring
- Time range selection (1h, 6h, 24h)
- Agent performance comparison
- Mini sparkline charts

**Props:**
```typescript
interface AgentMetricsProps {
  agents: Agent[]
  metrics?: AgentMetrics[]
  className?: string
}
```

**State Management:**
- Selected agent tracking
- Time range filtering
- Chart data processing

## 🎨 Design Patterns

### State Management
- **Local State:** Component-specific state using `useState`
- **Prop Drilling:** Data passed down through component hierarchy
- **WebSocket Updates:** Real-time state synchronization

### Styling Approach
- **Tailwind CSS:** Utility-first styling with custom design tokens
- **Component Classes:** Reusable CSS classes defined in `index.css`
- **Conditional Styling:** Dynamic classes using `cn()` utility function

### Error Handling
- **Graceful Degradation:** Components work with missing data
- **Loading States:** Skeleton screens and loading indicators
- **Error Boundaries:** Catch component errors without crashing

## 🔄 Data Flow

```
WebSocket Server
    ↓
useWebSocket Hook
    ↓
App.tsx State
    ↓
Dashboard.tsx
    ↓
Individual Components
```

### Real-time Updates
1. WebSocket receives server event
2. `useWebSocket` hook processes message
3. App state updated via callback
4. Components re-render with new data
5. UI reflects changes immediately

## 🧪 Testing Considerations

### Mock Data
- Components include mock data for development
- Graceful handling of missing props
- Realistic data structures for testing

### Responsive Design
- Mobile-first design approach
- Breakpoint testing required
- Touch-friendly interactions

### Accessibility
- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- Color contrast compliance

## 🚀 Performance Optimizations

### React Patterns
- Functional components with hooks
- Memo for expensive re-renders
- Lazy loading for large datasets
- Debounced search inputs

### Bundle Optimization
- Code splitting by route
- Tree shaking for unused code
- CSS purging in production
- Image optimization

## 🔧 Customization Guide

### Adding New Components
1. Create component in `src/components/`
2. Add TypeScript interfaces to `src/types/`
3. Import and use in `Dashboard.tsx`
4. Add routing if needed in `App.tsx`

### Styling Customization
- Edit `tailwind.config.js` for theme changes
- Modify `src/index.css` for global styles
- Use design tokens for consistent theming

### WebSocket Integration
- Add new event types to `src/types/index.ts`
- Handle events in `useWebSocket` hook
- Update component state via callbacks

---

This documentation should be updated as components evolve and new features are added.