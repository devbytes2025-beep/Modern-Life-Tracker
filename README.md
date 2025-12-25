# GlassHabit Tracker

A modern, glassmorphism-styled habit tracker built with React, Tailwind CSS, and Cloudflare Workers (D1 Database).

## Setup Guide

### 1. Prerequisites
- Node.js installed
- Cloudflare account (for Wrangler)

### 2. Installation
Open your terminal **inside this project folder** and run:

```bash
npm install
```

### 3. Database Setup (Cloudflare D1)

1. **Create the Database:**
   ```bash
   npm run db:create
   ```
   *Copy the `database_id` from the output and paste it into `wrangler.toml`.*

2. **Initialize Tables:**
   ```bash
   npm run db:init
   ```
   *This runs the `worker/schema.sql` file on your remote database.*

### 4. Deploy Backend
```bash
npm run deploy:worker
```
*Note the URL provided after deployment (e.g., `https://glasshabit-worker.yourname.workers.dev`).*

### 5. Connect Frontend
Create a `.env` file in the root directory:
```
VITE_API_URL=https://glasshabit-worker.yourname.workers.dev/api
```

### 6. Run Frontend
```bash
npm run dev
```

## Features
- **Habit Tracking:** Streaks, logs, and categories.
- **Gamification:** Earn XP for completing tasks.
- **Journal:** Record your daily mood and thoughts.
- **Finance:** Track simple expenses.
- **AI Integration:** Daily motivational quotes via Gemini.
