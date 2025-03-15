# Inventory Management System - Web Frontend

The web frontend for the Inventory Management System (IMS), a state-of-the-art enterprise application designed to provide comprehensive inventory aggregation and distribution capabilities for licensed prime brokers operating across global jurisdictions.

## Technology Stack

- React 18.2 for component-based architecture
- Redux 4.2 for state management
- Material-UI 5.13 for base component library
- AG Grid 29.3 for high-performance data tables
- D3.js 7.8 for custom data visualizations
- React Query 4.29 for data fetching and caching
- WebSocket for real-time updates
- TypeScript 4.9 for type safety
- Jest and React Testing Library for testing

## Getting Started

### Prerequisites
- Node.js 16+ and npm 8+
- Access to backend services (local or remote)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Application Structure

```
src/
├── api/            # API client and service methods
├── assets/         # Static assets (images, fonts)
├── components/     # Reusable UI components
├── constants/      # Application constants
├── contexts/       # React contexts
├── features/       # Feature-specific code
├── hooks/          # Custom React hooks
├── locales/        # Internationalization files
├── pages/          # Page components
├── router/         # Routing configuration
├── services/       # Business logic services
├── state/          # Redux state management
├── styles/         # Global styles and themes
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── App.tsx         # Main application component
└── index.tsx       # Application entry point
```

## Key Features

- **Dashboard**: Overview of system status, inventory summary, and locate requests
- **Positions**: Real-time position visualization with filtering and aggregation
- **Inventory**: Inventory dashboard with category breakdown and availability metrics
- **Locates**: Locate management interface for approval workflows
- **Exceptions**: Exception management dashboard for handling data issues
- **Rules**: Calculation rule management for configuring business logic
- **Analytics**: Advanced analytics and reporting capabilities
- **Settings**: User and application settings

## Performance Optimizations

The application implements several performance optimization techniques:

- **Virtualized Lists**: AG Grid with row virtualization for handling large datasets
- **Code Splitting**: Lazy loading of routes and components
- **Memoization**: React.memo and useMemo for expensive calculations
- **Efficient Rendering**: Optimized component rendering with proper keys and dependencies
- **Data Caching**: React Query for efficient data fetching and caching
- **Bundle Optimization**: Webpack optimization and tree shaking

Use `npm run analyze` to visualize the bundle size and identify optimization opportunities.

## State Management

The application uses Redux for global state management with the following structure:

- **Auth**: Authentication state and user information
- **Positions**: Position data and filters
- **Inventory**: Inventory availability and categories
- **Locates**: Locate requests and approval state
- **Orders**: Order validation and status
- **Rules**: Calculation rules and configurations
- **Exceptions**: System exceptions and resolution status
- **UI**: UI-specific state like sidebar collapse, active tabs
- **Notifications**: System notifications and alerts

React Query is used alongside Redux for server state management.

## Real-time Updates

The application uses WebSockets for real-time updates with the following channels:

- **Position Updates**: Real-time position changes
- **Inventory Updates**: Inventory availability changes
- **Locate Updates**: New locate requests and status changes
- **Exception Updates**: New system exceptions
- **Alert Updates**: System alerts and notifications

The WebSocket connection is managed through a custom hook and middleware.

## Testing

The application uses Jest and React Testing Library for testing:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows

Run tests with:
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific tests
npm test -- -t "component name"
```

## Code Quality

The project uses several tools to maintain code quality:

- **ESLint**: JavaScript and TypeScript linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files

Run quality checks with:
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Deployment

The application can be deployed using the following methods:

- **Docker**: Use the provided Dockerfile and docker-compose.yml
- **Static Hosting**: Deploy the build output to any static hosting service
- **Kubernetes**: Use the Kubernetes configurations in the infrastructure directory

Build the application for production with:
```bash
npm run build
```

The build output will be in the `build` directory.

## Contributing

Please follow these guidelines when contributing to the project:

- Follow the established code style and architecture
- Write tests for new features and bug fixes
- Update documentation as needed
- Create feature branches from develop
- Submit pull requests to the develop branch

Refer to the project's contribution guidelines for more details.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.