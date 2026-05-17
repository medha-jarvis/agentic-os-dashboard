# Agentic OS Dashboard

A modern, real-time dashboard for monitoring and managing multi-agent orchestration systems.

## Features

- **Real-Time Monitoring**: Auto-refresh every 5 seconds
- **Agent Status**: Live status indicators for Medha and Hermes agents
- **Task Queue Management**: View pending, in-progress, completed, and failed tasks
- **Activity Logs**: Stream recent logs from orchestrator and event triggers
- **Dark Mode UI**: Modern slate design with violet accents
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: shadcn/ui + Tailwind CSS
- **Components**: Radix UI primitives
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+
- Access to Agentic OS data directory at `/docker/hermes-agent-owlt/data`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Deployment

Deploy to Vercel with one click.

## License

MIT
