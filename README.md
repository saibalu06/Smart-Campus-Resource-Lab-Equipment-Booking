# Smart Campus Resource & Lab Equipment Booking System (CampusLab Reserve)

A full-stack campus equipment and laboratory scheduling platform built with **React + Vite + Tailwind CSS** on the frontend and **Node.js + Express + SQLite (`better-sqlite3`) + JWT** on the backend.

## Architecture Overview

```
/
├── backend/
│   ├── app.ts                 # Express app factory, DB initialization & route mounting
│   ├── db.ts                  # SQLite connection (WAL mode, FK constraints) & schema setup
│   ├── seed.ts                # Idempotent first-startup database seed (users, resources, bookings)
│   ├── types.ts               # Backend TypeScript domain models
│   ├── middleware/
│   │   └── auth.ts            # JWT token signing, verification, and Lab Admin RBAC guard
│   └── routes/
│       ├── auth.ts            # POST /api/auth/register, /api/auth/login, GET /api/auth/me
│       ├── resources.ts       # Filterable catalog & Lab Admin CRUD (/api/resources)
│       ├── bookings.ts        # Slot lookup, conflict-free booking engine & approval workflow
│       └── analytics.ts       # KPI summary & RFC-4180 CSV booking history export
├── frontend/
│   ├── App.tsx                # Root workspace orchestrating Catalog, My Bookings & Admin Console
│   ├── types.ts               # Shared frontend TypeScript models
│   ├── api/
│   │   └── client.ts          # Typed fetch client with JWT Bearer injection & CSV download
│   ├── context/
│   │   └── AuthContext.tsx    # Persistent JWT session state
│   └── components/
│       ├── Header.tsx             # 3-zone top navigation bar
│       ├── AuthModal.tsx          # Sign In / Register with role selector & 1-click demo accounts
│       ├── ResourceCatalog.tsx    # Category tabs, availability filter, live search & resource grid
│       ├── ResourceCard.tsx       # Equipment card with specs, location & max booking duration
│       ├── BookingModal.tsx       # Date/time slot picker with live occupied slots & conflict detection
│       ├── MyBookingsView.tsx     # Student reservation tracker with cancellation & rejection notes
│       ├── AdminDashboardView.tsx # KPI cards, CSV export, approval queue & inventory table
│       ├── ResourceFormModal.tsx  # Add/Edit resource modal for Lab Admin
│       └── StatusLabel.tsx        # Accessible icon + text semantic status indicators
├── src/
│   ├── App.tsx                # Vite entry wrapper pointing to /frontend/App.tsx
│   ├── main.tsx               # React root mount
│   └── index.css              # Tailwind CSS v4 & typography configuration
├── server.ts                  # Express + Vite middleware dev/prod server on port 3000
└── .env.example               # Default local environment variables (zero external dependencies)
```

## Key Features

- **Role-Based Authentication (JWT)**: Register as a **Student** or **Lab Admin**, or sign in immediately with pre-seeded campus accounts.
- **Resource Catalog**: Filter lab resources across **Electronics Lab**, **Computing Lab**, and **Seminar Rooms** by category, status (`Available`, `In Use`, `Maintenance`), or keyword search.
- **Conflict-Free Booking Engine**:
  - Live occupied-slot preview per resource and date before submitting.
  - Atomic SQLite transaction (`db.transaction`) validates `start_time < end_time`, enforces `max_duration_hours`, blocks resources in `Maintenance`, and rejects any slot overlapping an existing `Approved` or `Pending` booking (`start_time < newEnd AND end_time > newStart`) with `409 Conflict`.
- **Lab Admin Workflow**:
  - 1-click **Approve** (with re-verification of slot conflicts) and **Reject** (with optional rejection reason).
  - Add/edit equipment and toggle operational status (`Available`, `In Use`, `Maintenance`).
  - **Analytics & CSV Export**: Summary metrics (`Total Resources`, `Active Bookings Today`, `Pending Approvals`, `Utilization %`) and one-click **Download CSV Report**.

## Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment (optional — sensible defaults work out of the box)**:
   ```bash
   cp .env.example .env
   ```

3. **Start the full-stack development server** (runs Express API + Vite on `http://localhost:3000`):
   ```bash
   npm run dev
   ```

4. **Production build & run**:
   ```bash
   npm run build
   NODE_ENV=production npm run dev
   ```

## Pre-Seeded Login Credentials

The SQLite database (`./data/campus_lab.db`) automatically initializes and seeds **1 Lab Admin**, **2 Students**, **8 lab resources**, and sample bookings on first startup:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Lab Admin** | Dr. Elena Vance | `admin@campus.edu` | `AdminPass123!` |
| **Student** | Maya Lin | `maya.lin@campus.edu` | `Student123!` |
| **Student** | Marcus Reid | `marcus.reid@campus.edu` | `Student123!` |
