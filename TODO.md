# CodeSwap Arena - Remaining Work & Roadmap

## 1. Backend Infrastructure & Core Logic
- [ ] Implement robust error handling in `backend/server.js` and controllers.
- [ ] Refine `backend/services/swapEngine.js` (how code blocks are shuffled and assigned between participants).
- [ ] Finalize `backend/services/sandboxRunner.js` integration with `Judge0`.
- [ ] Add real-time updates via Socket.io (check `frontend/src/services/socket.js` vs `backend` implementation).

## 2. Frontend / UI Development
- [ ] Connect `frontend/src/pages/student/DebugWorkspace.jsx` to real API endpoints.
- [ ] Build out the "Swap" animation/flow in `SwapManager.jsx`.
- [ ] Implement the leaderboard real-time updates (`frontend/src/pages/organizer/ContestLeaderboard.jsx`).

## 3. Security & Admin
- [ ] Audit `backend/middleware/auth.js` and `contestGuard.js` for permission edge cases.
- [ ] Complete `AdminAuditLogs.jsx` functionality.

## 4. Verification
- [ ] End-to-end flow test:
    - [ ] Login (Organizer) -> Create Contest -> Add Participants -> Open Round -> Verify Assignments.
    - [ ] Login (Student) -> Join Contest -> View Assigned Code -> Submit Bug/Fix -> Verify Leaderboard update.
