# Code Review Results

This document summarizes the results of the code review for the stamp calendar application.
It identifies the issues and proposes a plan for fixing them.

## List of Issues

| ID | Priority | Type | File | Issue |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-1** | <font color="red">**Critical**</font> | Bug | `src/web/middleware/session.js` | `getSessionData` is an `async` function but is called without `await`. This prevents session data (user info and stamps) from being fetched correctly. |
| **BUG-2** | <font color="orange">**High**</font> | Bug | `src/domain/session.js`, `src/web/components/CalendarPage.jsx` | The data structure of stamps from the DB does not match what the frontend component expects. (`lectureId` vs `lectureType`) |
| **BUG-3** | <font color="orange">**High**</font> | Missing Feature | `src/web/components/CalendarPage.jsx`, `src/web/routes.js` | There is no UI on the calendar page to add a stamp. The stamping logic is incorrectly tied to the `/stamp` route after lecture selection. |
| **BUG-4** | <font color="orange">**Medium**</font> | Bug | `src/web/routes.js` | The relative import path for `getAvailableLectures` is `../../domain/lectures.js`, which is incorrect. It should be `../domain/lectures.js`. |
| **REFACTOR-1** | <font color="green">**Low**</font> | Refactor | `src/web/routes.js` | The `/stamp` route handler re-fetches user info from the session, which is redundant as it's already in the context. |
| **REFACTOR-2** | <font color="green">**Low**</font> | Refactor | `src/domain/session.js` | `getSessionData` is declared as `async` and uses `await` for synchronous DB calls, which is misleading. |
| **REFACTOR-3** | <font color="green">**Low**</font> | Refactor | `src/web/routes.js` | Unused imports (`getMonthDates`, `isValidISODateString`, `jsx`) remain in the file. |

## Remediation Plan

The following steps will be taken to address these issues.

1.  **Fix Session Middleware (BUG-1, REFACTOR-2):**
    -   Add `await` to the `getSessionData` call in `src/web/middleware/session.js`.
    -   Remove the unnecessary `async/await` from `getSessionData` in `src/domain/session.js` to make it a synchronous function.

2.  **Fix Data Structure Mismatch (BUG-2):**
    -   In `src/domain/session.js`, transform the stamp data within `getSessionData` to map the `lectureId` to a `lectureType` property, matching the component's expectation.

3.  **Fix Import Path and Unused Code (BUG-4, REFACTOR-3):**
    -   Correct the import path for `getAvailableLectures` in `src/web/routes.js`.
    -   Remove the unused imports from `src/web/routes.js`.

4.  **Implement Stamping UI and Logic (BUG-3, REFACTOR-1):**
    -   Remove the old `/stamp` route from `src/web/routes.js`.
    -   Create a new API endpoint `POST /calendar/stamp` in `src/web/routes.js`. This endpoint will accept a date and lecture ID, record the stamp, and return the updated calendar grid HTML.
    -   Modify `src/web/components/CalendarPage.jsx` so that clicking a date cell opens a modal to select a lecture. Use htmx to send a request to `POST /calendar/stamp` and dynamically update the calendar.
    -   Remove the logic for redirecting to the lecture selection page (`/select-lecture`) from `src/web/routes.js`.

5.  **Final Verification and Testing:**
    -   Run the application and manually test the entire flow from LINE login to creating and viewing stamps to ensure everything works correctly.
