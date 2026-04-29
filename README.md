# ClientFlow

A full-featured CRM with a visual kanban pipeline for managing clients, projects, and sales interactions.

**[Live Demo](https://clientflow.vercel.app)** · **[Portfolio](https://jimmmy-portfolio.vercel.app)**

---

## Features

- **Kanban Pipeline** — Drag-and-drop clients across 10 stages (Prospect → Archive)
- **Client Profiles** — Contact info, budget tracking, notes with auto-save, interaction timeline
- **Gantt Charts** — Two views: client-based timelines and team workload distribution
- **Schedule** — Calendar with event types (meetings, calls, tasks), ICS import support
- **Call Tracker** — Daily call counter with stats per team member
- **Team Management** — Member directory, follow system, activity leaderboard
- **Advanced Filters** — Search by name, city, website status, pipeline stage

## Screenshots

> Screenshots coming soon

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite 7, Lucide React |
| Backend | Vercel Serverless Functions |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 16+
- PostgreSQL database ([Neon](https://neon.tech) recommended)

### Installation

```bash
git clone https://github.com/jimmy-ngome/ClientFlow.git
cd ClientFlow
npm install
```

### Environment Variables

Create a `.env` file:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### Database Setup

```bash
npm run db:generate
npm run db:migrate
```

### Run

```bash
npm run dev
```

The app runs on `http://localhost:3001`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |

## Project Structure

```
├── api/                # Serverless API routes
│   ├── clients/        # Client CRUD
│   ├── projects/       # Project management
│   ├── schedule-events/# Calendar events
│   ├── interactions/   # Interaction logs
│   ├── team-members/   # Team management
│   └── tags/           # Tag system
├── db/
│   ├── schema.js       # Drizzle ORM schema (8 tables)
│   └── migrations/     # SQL migrations
├── src/
│   ├── components/
│   │   ├── Pipeline.jsx      # Kanban board
│   │   ├── ClientDetail.jsx  # Client profile
│   │   ├── GanttPage.jsx     # Project timeline
│   │   ├── SchedulePage.jsx  # Calendar
│   │   ├── CallTracker.jsx   # Call counter
│   │   └── FriendsPage.jsx   # Team & social
│   └── App.jsx
└── vercel.json
```

## Database Schema

8 tables: `clients`, `tags`, `client_tags`, `team_members`, `projects`, `schedule_events`, `interactions`, `follows`

## License

MIT
