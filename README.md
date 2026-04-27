# ClientFlow

A modern CRM pipeline app for managing clients, projects, and business interactions. Features a visual kanban-style pipeline with drag-and-drop.

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white)

## Features

- Visual kanban pipeline for tracking client stages (Lead, Contact, Negotiation, Closed)
- Client detail view with interaction timeline
- Add, edit, and move clients across pipeline stages
- Responsive design (desktop + mobile)
- Serverless API with PostgreSQL database

## Tech Stack

- **Frontend**: React 19 + Vite 7
- **Backend**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle ORM
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/clientflow.git
cd clientflow

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your DATABASE_URL in .env

# Run database migrations
npm run db:migrate

# Start dev server
npm run dev
```

## Project Structure

```
api/           # Serverless functions (REST endpoints)
db/            # Drizzle schema & migrations
src/
  components/  # React components
  App.jsx      # Main app entry
public/        # Static assets
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |

## License

MIT
