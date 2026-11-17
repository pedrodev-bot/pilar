# Pilar — Offline-First Personal Finance Tracker

[![Version](https://img.shields.io/badge/version-1.0.0-a3e635?style=flat-square&labelColor=121216)](https://github.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=121216)](LICENSE)
[![Mobile](https://img.shields.io/badge/Mobile-React%20Native%20%7C%20Expo-0ea5e9?style=flat-square&labelColor=121216)](#tech-stack)
[![Backend](https://img.shields.io/badge/API-FastAPI%20%7C%20PostgreSQL-22c55e?style=flat-square&labelColor=121216)](#tech-stack)

**Pilar** is a cross-platform personal finance management application engineered with an **Offline-First** architecture. Designed to eliminate friction in daily financial tracking, it delivers instant local persistence, automatic background cloud synchronization, biometric security, and seamless multi-format data portability.

---

## Core Features

### Financial Tracking & Insights
* **Zero-Latency CRUD:** Instant creation, editing, and deletion of **Expenses**, **Incomes**, and **Investments** powered by local state persistence (`AsyncStorage`).
* **Modular Home Dashboard:** Customizable widgets featuring **Current Balance Overview**, **Expense Summary** (1-week and 1-month bar charts with daily/weekly averages), **Predictive Monthly Spending Insight**, and **Recent Transactions**.
* **Privacy Mode:** One-tap balance masking across the entire interface.

### Offline-First Synchronization Engine
* **Resilient Sync Queue:** Every offline mutation is queued locally and automatically reconciled with the cloud API upon network recovery (`NetInfo`) or app foregrounding (`AppState`).
* **Multi-Tenant Isolation:** Strict per-user data partitioning across both local device storage and server-side database queries.

### Data Portability & Localization
* **Multi-Format Export:** Export full transaction histories or custom date ranges to **XLSX (Excel)**, **CSV**, or **JSON**.
* **Backup & Restore:** Import and validate external backups with automatic deduplication, schema sanitization, and *Merge* or *Replace* strategies.
* **Internationalization (i18n) & Multi-Currency:** Native support for **Portuguese (`pt-BR`)** and **English (`en-US`)**, with dynamic currency formatting (`BRL`, `USD`, `EUR`, `GBP`) and Dark/Light themes.

### Security & Authentication
* **Cloud Authentication:** Email/password authentication managed via **Supabase Auth**, with encrypted session token storage on device (`expo-secure-store`).
* **Biometric App Lock:** Hardware-backed PIN/Biometric lock screen (`expo-local-authentication`) triggered automatically when backgrounding the app.
* **Account Lifecycle Management:** Full self-service account deletion that purges both authentication credentials and relational records.

---

## Architecture Overview

```text
┌─────────────────────────────┐         HTTPS / JWT         ┌─────────────────────────────┐
│        Mobile Client        │ ◄─────────────────────────► │         FastAPI REST        │
│  React Native + Expo Router │                             │     Python + SQLAlchemy     │
│                             │                             │                             │
│  ┌───────────────────────┐  │                             │  ┌───────────────────────┐  │
│  │ Zustand + AsyncStorage│  │                             │  │   Supabase Auth SDK   │  │
│  │  (Offline Sync Queue) │  │                             │  │  (Token Verification) │  │
│  └───────────────────────┘  │                             │  └───────────────────────┘  │
└─────────────────────────────┘                             └──────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                            ┌─────────────────────────────┐
                                                            │     PostgreSQL Database     │
                                                            │  (ACID Financial Storage)   │
                                                            └─────────────────────────────┘
```

---

## Tech Stack

### Mobile (`mobile/`)
* **Framework:** React Native, Expo & Expo Router (file-based navigation)
* **Language:** TypeScript (strict mode)
* **State & Persistence:** Zustand + AsyncStorage + Expo SecureStore
* **Native Capabilities:** Expo Local Authentication, Expo Notifications, Expo Document Picker, Expo Sharing, NetInfo
* **Testing:** Jest + `ts-jest`

### Backend (`api/`)
* **Framework:** FastAPI + Uvicorn
* **ORM & Database:** SQLAlchemy + PostgreSQL (Docker-ready)
* **Validation & Auth:** Pydantic v2 + Supabase Admin SDK
* **Testing:** Pytest + FastAPI TestClient

---

## Getting Started

### Prerequisites
* **Node.js** (v20+) & **npm**
* **Python** (3.11+)
* **Docker & Docker Compose** (for local PostgreSQL) or a hosted PostgreSQL instance
* A **Supabase** project (URL, Anon Key, and Service Role Key)

### 1. Database Setup
Start the local PostgreSQL container from the repository root:

```bash
cp .env.example .env
docker-compose up -d
```

### 2. Backend API Setup
Configure environment variables, install dependencies, and start the FastAPI server:

```bash
cd api
cp .env.example .env
# Fill in DATABASE_URL, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in api/.env

python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Mobile App Setup
Configure environment variables and launch the Expo development server:

```bash
cd mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_API_URL

npm install
npx expo start
```

---

## Running Automated Tests

Both the API and Mobile layers include automated test suites covering authentication enforcement, multi-tenant data isolation (IDOR protection), offline sync boundaries, and backup sanitization.

**Backend Security & Integration Tests:**
```bash
cd api
pytest -v
```

**Mobile Offline Isolation & Parser Tests:**
```bash
cd mobile
npm test
```

---

## Security Practices
* **Zero Secret Exposure:** Sensitive credentials (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) remain strictly isolated on the backend; the mobile bundle only embeds public Supabase client keys.
* **Server-Side Ownership Enforcement:** Every transaction endpoint (`GET`, `PUT`, `DELETE`) verifies the caller's JWT via Supabase and scopes queries strictly to `current_user.id`.
* **Encrypted Token Storage:** Session tokens on mobile devices are persisted inside the OS keychain/keystore via `expo-secure-store`.

---

## License

This project is licensed under the [MIT License](LICENSE).