# HAQMS: Hospital Appointment & Queue Management System

HAQMS (Hospital Appointment & Queue Management System) is a full-stack clinic management platform designed to streamline patient registration, practitioner scheduling, and real-time outpatient queue control. 

This repository represents an audited, fully refactored, and highly optimized version of the original legacy codebase, addressing critical security vulnerabilities, performance bottlenecks, concurrency races, and UI styling inconsistencies.

---

## 🚀 Key Features

*   **Receptionist Dashboard**: Quick patient registration, directory search, slot-based appointment scheduling, and instant direct walk-in check-ins.
*   **Doctor Portal**: A real-time workspace displaying daily scheduled bookings, patient clinical records, and a queue controller to page, consult, or skip patients.
*   **Administrative Auditing**: Statistics dashboard rendering clinic-wide metrics and doctor consultation revenue.
*   **Public Queue Board**: A live-updating screen for patient token monitoring.
*   **Premium Custom Theme**: Custom dark/light mode toggle with state persistence and anti-flicker server-to-client handoff.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend**: Next.js 16.2 (App Router) + Tailwind CSS v4 + Lucide Icons + React Context API
*   **Backend**: Node.js + Express REST API
*   **Database & ORM**: PostgreSQL + Prisma ORM
*   **Infrastructure**: Docker Compose (Optional local PostgreSQL helper)

---

## ⚙️ Prerequisites

Before setting up the project, ensure you have the following installed globally on your system:
*   **Node.js** (v18.0.0 or higher)
*   **npm** (v9.0.0 or higher)
*   **Docker & Docker Compose** (Optional, if using the containerized database setup)
*   **PostgreSQL** (If running database natively on your host machine)

---

## 🚀 Setup & Installation Instructions

Follow these step-by-step instructions to run the application on any development environment:

### Step 1: Install Workspace Dependencies
Open a terminal in the root folder of the project and run the following command to install dependencies across the root, frontend, and backend packages:

*   **Using script (Linux / macOS)**:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
*   **Using npm globally (Windows / All OS)**:
    ```bash
    # Install root, backend, and frontend packages in one command
    npm run install:all
    ```

### Step 2: Configure Environment Variables
Create a environment configuration file named `.env` in the `backend/` directory. You can copy the template file:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` in your text editor and specify your database and JWT secret details:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/haqms?schema=public"
JWT_SECRET="dev_jwt_secret_key_change_me"
JWT_EXPIRES_IN="8h"
PORT=5000
NODE_ENV=development
ALLOWED_ORIGIN="http://localhost:3000"
```
*(Note: If utilizing Docker Desktop on Windows under WSL, replace `localhost` in the `DATABASE_URL` with your WSL virtual machine IP address, e.g., `172.31.53.169`).*

### Step 3: Run the PostgreSQL Database
Choose one of the two methods below to start your database:

*   **Option A: Using Docker Compose (Recommended)**:
    Start the pre-configured containerized PostgreSQL server in the background:
    ```bash
    docker-compose up -d
    ```
*   **Option B: Using Native PostgreSQL**:
    Start your local PostgreSQL service and update the credentials in the `backend/.env` file.

### Step 4: Apply Database Schema & Seed Mock Data
Run migrations and populate the tables with pre-built mock records (containing doctor accounts, receptionist profiles, patients, and starting appointments):
```bash
# In the project root directory
npm run db:setup --prefix backend
```

### Step 5: Start the Development Servers
Start both the Next.js frontend client and the Express backend API server concurrently using the root package runner:
```bash
# Run from the project root directory
npm run dev
```
Once launched:
*   **Frontend client** will be running at: [http://localhost:3000](http://localhost:3000)
*   **Backend API** will be running at: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Seeded Demo Credentials
The database seed script sets up default roles for testing (password for all: **`password123`**):

| Role | Account Email | Purpose |
| :--- | :--- | :--- |
| **Admin** | `admin@haqms.com` | Access system reports, view clinic stats, view doctor registry. |
| **Receptionist** | `reception1@haqms.com` | Patient registration, book appointments, check-in patients. |
| **Doctor** | `doctor1@haqms.com` | View doctor worklist, check clinical history, manage queue statuses. |

---

## 🔧 Summary of Engineering Improvements

A total of 11 core structural issues were resolved during the audit of the legacy codebase. For exact line numbers and side-by-side code comparisons, see the [word.md](word.md) report in the project root:

1.  **Tailwind v4 Dark Mode Integration**: Configured class-based dark mode selector in `globals.css` and added theme initialization scripts in `layout.js` to block theme flickering.
2.  **React Hook Rule Compliance**: Fixed React runtime crashes in `dashboard/page.js` by moving conditional early returns below state declarations.
3.  **Role Hijack Prevention**: Protected the `/register` endpoint from administrative self-registration, returning `403 Forbidden` for unauthorized `ADMIN` payload requests.
4.  **Timing Attack Prevention**: Replaced dummy bcrypt hashing routines with a pre-computed valid 60-character salt comparison, eliminating timing differentials on invalid login attempts.
5.  **Queue Concurrency Lock**: Enforced database-level `Serializable` transaction isolation for direct check-ins to prevent concurrent duplicate token assignments.
6.  **N+1 Query Elimination**: Rewrote the appointments query logic to utilize Prisma `include` joins, reducing loop overhead down to a single eager query.
7.  **Slot-Based Double-Booking Check**: Replaced exact-millisecond date checks with a 30-minute booking constraint window.
8.  **Prisma Pagination Offloading**: Replaced in-memory Javascript arrays slicing with native database pagination parameters (`skip`/`take`).
9.  **Patient Deletion Protection**: Restored broken delete middlewares, strictly restricting patient deletion privileges to `ADMIN` roles.
10. **Dynamic Diagnostic History Timeline**: Created the missing Dynamic Patient Timeline page at `/patients/[id]/history-records/page.js` to display previous clinical records.
11. **Doctor User Matching Fallback**: Added a fallback name matching logic to dynamically map authenticated doctor users to their Doctor profile entries in the database, solving empty doctor dashboards.
