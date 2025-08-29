# Buzz Platform

A comprehensive food delivery platform built with a monorepo architecture.

## Project Structure

```
buzz/
├── packages/
│   ├── database/          # Database schemas and migrations (Prisma)
│   ├── shared/            # Shared types and utilities
│   └── api/               # Backend API server (Fastify)
├── apps/
│   ├── buzz/              # Customer mobile web app (React + Vite)
│   ├── buzz-biz/          # Business dashboard (React + Vite)
│   └── buzz-admin/        # Admin dashboard (React + Vite)
├── package.json           # Root package.json with workspace configuration
├── tsconfig.json          # Root TypeScript configuration
├── turbo.json            # Turbo build configuration
└── README.md
```

## Technology Stack

### Backend
- **API**: Fastify with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Styled Components
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Data Fetching**: TanStack Query (React Query)

### Development Tools
- **Monorepo**: pnpm workspaces with Turbo
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Type Checking**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18 or higher
- pnpm 8 or higher
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd buzz
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy environment files
cp packages/api/.env.example packages/api/.env
```

4. Set up the database:
```bash
# Generate Prisma client
cd packages/database
pnpm db:generate

# Run migrations
pnpm migrate
```

### Development

Start all applications in development mode:
```bash
pnpm dev
```

This will start:
- API server at http://localhost:8083
- Customer app at http://localhost:8010
- Business dashboard at http://localhost:8012
- Admin dashboard at http://localhost:8013

### Individual Commands

#### Database
```bash
cd packages/database
pnpm db:generate    # Generate Prisma client
pnpm migrate        # Run database migrations
pnpm db:seed        # Seed database with test data
pnpm db:studio      # Open Prisma Studio
```

#### API Server
```bash
cd packages/api
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm start         # Start production server
```

#### Frontend Apps
```bash
cd apps/buzz       # or buzz-biz, buzz-admin
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm preview       # Preview production build
```

### Building for Production

Build all packages and apps:
```bash
pnpm build
```

Build specific workspace:
```bash
pnpm build --filter=buzz          # Build customer app only
pnpm build --filter=@buzz/api     # Build API only
```

## API Documentation

When running the API server, documentation is available at:
- Swagger UI: http://localhost:8083/docs
- Health Check: http://localhost:8083/health

## Applications

### Customer App (buzz)
- Product browsing and search
- Restaurant listings
- Order placement and tracking
- User account management
- Progressive Web App (PWA) support

### Business Dashboard (buzz-biz)
- Order management
- Menu management
- Sales analytics
- Business settings

### Admin Dashboard (buzz-admin)
- User management
- Business approval and management
- Platform analytics
- System settings

## Database Schema

The database includes the following main entities:
- **Users**: Customer accounts
- **Businesses**: Restaurant/vendor accounts
- **Products**: Menu items
- **Orders**: Customer orders with items
- **Reviews**: Customer reviews for businesses

## Contributing

1. Create a feature branch
2. Make your changes
3. Run type checking: `pnpm type-check`
4. Run linting: `pnpm lint`
5. Run formatting: `pnpm format`
6. Submit a pull request

## Scripts

- `pnpm dev` - Start all apps in development
- `pnpm build` - Build all packages and apps
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm type-check` - Type check all TypeScript
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean all build artifacts

## License

This project is proprietary and confidential.