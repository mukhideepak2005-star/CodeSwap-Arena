# CodeSwap Arena

**CodeSwap Arena** is a sophisticated, multi-organizer, multi-contest platform designed for competitive code debugging. Unlike traditional competitive programming, CodeSwap Arena focuses on the adversarial and collaborative nature of debugging through a unique "Bug Swap" mechanic.

## 🚀 The Core Loop: "Bug Swap"

1.  **Bug Introduction Phase**: Participants are assigned a clean, working code block for a specific challenge. They must intentionally introduce subtle, logical bugs into the code while ensuring it still "looks" correct but fails specific hidden test cases.
2.  **The Swap**: The platform's **Derangement Engine** automatically and anonymously redistributes these buggy submissions. No participant receives their own code back.
3.  **Debugging Phase**: Participants must analyze the buggy code received from a peer, identify the introduced errors, provide a fix, and write a rationale for their debugging process.
4.  **Evaluation**: Solutions are instantly graded against automated hidden test cases via the **Judge0** execution engine. Organizers then perform manual reviews of the bug explanations to award additional points.

## ✨ Key Features

-   **Multi-Organizer Isolation**: Separate dashboards for different organizers to manage their own contests, participants, and code libraries.
-   **Advanced Contest Management**: 
    -   Public discovery and private PIN-protected contests.
    -   Round-based progression (Bug Introduction -> Swap Configuration -> Debugging -> Evaluation).
    -   Bulk participant import and management.
-   **Anonymity & Security**: 
    -   Strict anonymous distribution of peer code.
    -   Permission-based middleware (RBAC) to ensure organizers only manage their own data.
    -   Sandboxed code execution for multiple languages (Python, JavaScript, C, C++, Java).
-   **Real-time Engagement**:
    -   Live Leaderboards with tie-breaking logic based on submission time and manual scores.
    -   Socket.io integration for real-time round state transitions and notifications.
-   **Administrative Oversight**:
    -   Platform Admin panel for monitoring organizers and system health.
    -   Comprehensive Audit Logs for every critical action.

## 🛠️ Tech Stack

-   **Frontend**: React, Tailwind CSS, Lucide Icons, Vite.
-   **Backend**: Node.js, Express, Socket.io.
-   **Database**: PostgreSQL (Support for Neon/Remote and PGlite embedded).
-   **Execution**: Judge0 API / Sandbox integration.
-   **Auth**: JWT-based authentication with role-specific guards.

## 🚦 Getting Started

### Prerequisites

-   Node.js (v18+)
-   PostgreSQL (or use the built-in PGlite)
-   Judge0 API Key (RapidAPI or self-hosted)

### Installation

1.  **Install all dependencies**:
    ```bash
    npm run install:all
    ```

2.  **Configure Environment**:
    Create a `.env` file in the `backend` directory based on `.env.example`:
    ```env
    PORT=5000
    DATABASE_URL=your_postgresql_url
    JWT_SECRET=your_secret
    JUDGE0_API_KEY=your_key
    ```

3.  **Run Migrations & Seed**:
    ```bash
    cd backend
    node database/migrate.js
    node database/seed.js
    ```

4.  **Start the Platform**:
    ```bash
    npm run dev
    ```

## 🧪 Simulation

You can run a full end-to-end 15-phase simulation (simulating 10 participants, bug introduction, swapping, and grading) by running:
```bash
cd backend
node test/simulation.js
```

## 📄 License

This project is licensed under the MIT License.

Co-Authored-By: Claude Code <noreply@anthropic.com>
🤖 Generated with [Claude Code](https://claude.com/claude-code)
