# One Wish Willow

One Wish Willow is a shared, anonymous world where each visitor can make one wish and explore the wishes around them. Rather than presenting a long list, it places every public wish in a large navigable canvas so the world can be discovered by panning, zooming, and using the map.

## What it does

- Lets each anonymous visitor create one wish of up to 280 characters.
- Stores that wish at a generated position in the world and remembers it through a secure, HTTP-only visitor cookie.
- Shows public wishes as individual cards when the view is close enough, and groups dense or distant areas into clusters.
- Includes a **Recent** list and **Find my wish** action to quickly return to a known wish.
- Keeps the selected wish visible as the user changes zoom level.
- Provides a clickable minimap that shows public wish density, the current viewport, and the selected wish.
- Uses custom pointer panning so a drag starts exactly where the pointer goes down, including after minimap navigation.

Hidden wishes are excluded from all public canvas, Recent, and minimap views.

## How the world stays easy to explore

The canvas does not load every wish into the browser. It requests only the visible part of the world from `/api/wishes` after navigation settles. At a broad zoom level—or when more than 200 wishes would be shown—the server returns aggregated cluster data instead of individual cards.

The minimap uses `/api/wishes/minimap`, which returns one summary point per world cluster rather than every wish. This gives users an overview of populated areas without transferring all wish content for the map.

```mermaid
flowchart LR
  Visitor["Visitor"] --> Browser["Next.js + React canvas"]
  Browser -->|"Create one wish"| Action["Server action"]
  Action --> Database[("PostgreSQL via Prisma")]
  Browser -->|"Visible viewport"| WishesAPI["/api/wishes"]
  Browser -->|"World summary"| MinimapAPI["/api/wishes/minimap"]
  WishesAPI --> Database
  MinimapAPI --> Database
  Browser -->|"Pan, zoom, Recent, minimap"| Explore["Discover wishes"]
```

## Tech stack

- [Next.js](https://nextjs.org/) 16 and [React](https://react.dev/) 19
- TypeScript and Tailwind CSS
- [Prisma ORM](https://www.prisma.io/) 7 with PostgreSQL
- `react-zoom-pan-pinch` for the world transform and zoom interaction
- pnpm 9 and Node.js 24

## Run locally

### Prerequisites

- Node.js 24
- pnpm 9 (`corepack enable` can provide the project-pinned version)
- A PostgreSQL database, such as [Neon](https://neon.com/)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
VISITOR_HASH_SECRET="replace-with-a-long-random-secret"
```

`DATABASE_URL` is the connection string for PostgreSQL. `VISITOR_HASH_SECRET` protects the anonymous visitor identifier before it is stored in the database; use a different strong value for every environment.

### 3. Apply database migrations

For a new local database, apply the committed migrations:

```bash
pnpm exec prisma migrate deploy
```

When you change `prisma/schema.prisma` during development, create and apply a new migration:

```bash
pnpm exec prisma migrate dev --name describe_your_change
```

### 4. Start the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate changes

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

`pnpm build` runs `prisma generate` first through the project's `prebuild` script, then builds Next.js.

## Deploy with Neon and Vercel

1. Create a PostgreSQL database in Neon and copy its connection string.
2. From a trusted local terminal, apply the checked-in migrations to that production database once:

   ```bash
   DATABASE_URL="your-neon-connection-string" pnpm exec prisma migrate deploy
   ```

3. Import this Git repository into Vercel.
4. In the Vercel project’s Production environment variables, add `DATABASE_URL` and a new strong `VISITOR_HASH_SECRET`.
5. Deploy. Vercel installs dependencies, runs `prebuild` to generate Prisma Client, then runs the Next.js build.

Do not put database migrations in the Vercel build command. Applying them explicitly keeps schema changes deliberate and avoids concurrent deployment races.

## Project structure

```text
app/
  page.tsx                     Server-rendered entry point
  wish-universe.tsx            Canvas state, fetching, selection, and panning coordinator
  wish-universe-canvas.tsx     World grid, wish cards, and clusters
  wish-universe-controls.tsx   Composer, Recent panel, and zoom controls
  wish-universe-minimap.tsx    Interactive world overview
  api/wishes/                  Viewport data endpoint
  api/wishes/minimap/          Aggregated minimap endpoint
lib/
  wish-queries.ts              Public, personal, recent, and cluster queries
  canvas-viewport.ts           Camera and world-coordinate helpers
prisma/
  schema.prisma                Database model
  migrations/                  Versioned schema migrations
```

## Data model and privacy

Each wish stores its text, a generated world coordinate, a cluster cell, timestamps, a hidden flag, and a one-way hash of the anonymous visitor ID. The raw visitor ID stays in the visitor’s HTTP-only cookie and is not stored in the database.
