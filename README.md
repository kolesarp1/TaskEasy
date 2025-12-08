# TaskCanvas

A personal visual task manager centered on an Eisenhower Matrix canvas. Create tasks instantly, attach screenshots, drag to prioritize.

## Features

- **Eisenhower Matrix View**: Visual 4-quadrant task organization
  - Do First (Urgent & Important)
  - Schedule (Not Urgent & Important)
  - Delegate (Urgent & Not Important)
  - Eliminate (Not Urgent & Not Important)
- **Canvas Positioning**: Tasks float freely within each quadrant
- **Drag & Drop**: Reposition tasks within or across quadrants
- **Double-Click Creation**: Create tasks inline at the clicked position
- **Task Details Panel**: Edit title, description, and manage screenshots
- **Screenshot Support**: Drag & drop or paste images from clipboard
- **Backlog View**: Sortable list for unprioritized tasks
- **Task Merging**: Select multiple tasks and merge into one
- **User Authentication**: Email/password with JWT cookies

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Drag & Drop**: dnd-kit
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma
- **Authentication**: JWT with httpOnly cookies

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Configure the database connection in `server/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskcanvas?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
```

3. Initialize the database:

```bash
npm run db:generate
npm run db:migrate
```

4. Start the development servers:

```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
TaskCanvas/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── api.ts         # API client
│   │   └── types.ts       # TypeScript types
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── lib/           # Utilities
│   └── prisma/            # Database schema
└── ...
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/merge` - Merge multiple tasks

### Screenshots
- `POST /api/screenshots/task/:taskId` - Upload screenshot
- `DELETE /api/screenshots/:id` - Delete screenshot

## Usage

1. **Create Account**: Sign up with email and password
2. **Add Tasks**: Double-click on any quadrant or use the Backlog "Add task" button
3. **Prioritize**: Drag tasks between quadrants based on urgency and importance
4. **Add Details**: Click a task to open the detail panel, add description and screenshots
5. **Merge Tasks**: Ctrl+click to select multiple tasks, then click "Merge"
