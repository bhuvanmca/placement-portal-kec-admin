# KEC Companies Portal

A standalone Next.js application for managing company details in the KEC Placement Cell. This application is extracted from the main Placement Portal Admin dashboard and focuses specifically on company management.

## Features

- 🏢 **Company Management** - Add, Edit, Delete companies visiting for recruitment
- ✅ **Readiness Checklist** - Track preparation status (Approval, Cab, Accommodation, Interview Rounds, QP Printouts)
- 🔍 **Search & Filter** - Search companies by name or eligible departments
- 🔐 **Admin Authentication** - Secure login using shared backend auth
- 📱 **Responsive Design** - Works on desktop and mobile
- 🌐 **Vercel Ready** - Configured for easy Vercel deployment

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **HTTP Client**: Axios
- **Auth**: JWT-based (shared with main backend)
- **Notifications**: Sonner toast

## Shared Backend

This application shares the **same backend** as the main Placement Portal Admin. It connects to the Go backend via the following API endpoints:

- `POST /v1/admin/auth/login` - Admin authentication
- `GET /v1/admin/companies` - Get all companies
- `POST /v1/admin/companies` - Create a company
- `PUT /v1/admin/companies/:id` - Update a company
- `PUT /v1/admin/companies/:id/checklist` - Update readiness checklist
- `DELETE /v1/admin/companies/:id` - Delete a company

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or bun
- Backend server running (shared with main Placement Portal)

### Installation

```bash
cd companies-portal
npm install
```

### Environment Setup

Create a `.env.local` file (already provided):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

### Development

```bash
npm run dev
```

The app will start on `http://localhost:3001` (to avoid conflicts with the main frontend on port 3000).

### Build

```bash
npm run build
```

## Deploying to Vercel

### Option 1: Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to the companies-portal directory:
   ```bash
   cd companies-portal
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set the environment variable in Vercel:
   ```bash
   vercel env add NEXT_PUBLIC_API_BASE_URL
   ```
   Enter your production backend URL (e.g., `https://your-backend-api.com/api`)

### Option 2: Vercel Dashboard (Recommended)

1. Push the `companies-portal` folder to a **separate Git repository** (or as a subfolder in your monorepo)

2. Go to [vercel.com/new](https://vercel.com/new)

3. Import your repository

4. If it's a monorepo, set the **Root Directory** to `companies-portal`

5. Add the environment variable:
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: Your production backend API URL (e.g., `https://your-backend-api.com/api`)

6. Click **Deploy**

### Important: CORS Configuration

Make sure your Go backend's CORS configuration allows requests from your Vercel deployment URL. Update the backend's CORS settings to include:

```
https://your-companies-portal.vercel.app
```

## Project Structure

```
companies-portal/
├── public/
│   ├── campus-bg.png          # Login background
│   └── kec-logo.png           # KEC logo
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── layout.tsx     # Protected dashboard layout
│   │   │   └── page.tsx       # Companies management page
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   ├── globals.css        # Theme & design tokens
│   │   ├── layout.tsx         # Root layout
│   │   ├── not-found.tsx      # 404 page
│   │   └── page.tsx           # Root redirect
│   ├── components/
│   │   ├── auth/
│   │   │   └── protected-route.tsx
│   │   ├── ui/                # shadcn/ui components
│   │   ├── connectivity-overlay.tsx
│   │   ├── header.tsx
│   │   └── server-error-overlay.tsx
│   ├── constants/
│   │   ├── config.ts          # API config (reads env var)
│   │   └── routes.ts          # App routes
│   ├── context/
│   │   └── auth-context.tsx   # Auth provider
│   ├── hooks/
│   │   └── use-online-status.ts
│   ├── lib/
│   │   ├── api.ts             # Axios instance
│   │   └── utils.ts           # Utility functions
│   ├── services/
│   │   └── company.service.ts # Company API service
│   ├── types/
│   │   └── auth.ts            # Auth types
│   └── utils/
│       └── auth.ts            # JWT utilities
├── .env.example
├── .env.local
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```
