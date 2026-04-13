# Role-Based Access Control (RBAC) Roadmap

This document outlines the strategy and implementation plan for introducing multi-role support to the EC-eduflow-v3-firebase application.

## 1. Goal
Transition from a single-user application to a multi-role system that allows the Business Owner to delegate tasks to Assistant/Support Staff without exposing destructive actions or sensitive administrative configurations.

## 2. Role Strategy

### Identity Management
- **Provider**: Google OAuth (Auth.js / NextAuth).
- **Identification**: Users are identified by their verified Google email address.
- **Whitelisting**: Only emails listed in `OWNER_EMAILS` or `STAFF_EMAILS` (environment variables) are allowed to sign in.

### Roles & Permissions Matrix

| Feature | Owner | Assistant / Staff |
| :--- | :---: | :---: |
| **View Leads** | ✅ | ✅ |
| **Edit Leads (Notes, Stages)** | ✅ | ✅ |
| **Send Communications (Templates)** | ✅ | ✅ |
| **Add New Leads** | ✅ | ✅ |
| **Delete Leads** | ✅ | ❌ |
| **Import Leads (Bulk)** | ✅ | ❌ |
| **Database/Sheet Setup** | ✅ | ❌ |
| **Export/Admin Tools** | ✅ | ❌ |

## 3. Implementation Phases

### Phase 1: Configuration & Foundations
- Define `UserRole` type ('owner' | 'assistant') in `lib/types.ts`.
- Update `.env.example` to include `OWNER_EMAILS` and `STAFF_EMAILS`.

### Phase 2: Secure Authentication
- Implement a `signIn` callback in `lib/auth.ts` to reject any Google ID not in the whitelists.
- Enhance the `jwt` and `session` callbacks to determine and persist the user's role.

### Phase 3: API Enforcement
- Protect sensitive API routes (e.g., `DELETE /api/leads/[id]`, `/api/setup/*`, `/api/admin/*`).
- Return `403 Forbidden` for unauthorized role attempts.

### Phase 4: UI Level Restrictions
- **Sidebar**: Hide "Import" and "Setup/Settings" menus for assistants.
- **Lead Drawer**: Hide the "Delete" button for assistants.
- **Setup Screen**: Prevent rendering the initialization UI for staff; show an "Access Denied" message if navigated directly.

## 4. Verification & Testing
1. **Owner Access**: Log in with an owner email; verify all features are available.
2. **Staff Access**: Log in with a staff email; verify destructive/admin buttons are hidden.
3. **Unauthorized Access**: Log in with an unlisted Google ID; verify the login is rejected with an error message.
4. **Direct API Call**: Attempt a `DELETE` request with a staff session; verify `403` response.
