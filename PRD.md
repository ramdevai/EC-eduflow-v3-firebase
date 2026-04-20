# EduCompass CRM - Product Requirements Document

## 1. Product Overview

**Product Name:** EduCompass CRM  
**Type:** Career Counseling Lead Management System  
**Target Users:** Single consultant (Admin) and staff members managing student leads through a counseling pipeline

**Core Functionality:** A lead management system that tracks students through a 9-stage career counseling pipeline, automates Google Contacts synchronization, provides communication tools for parent/student outreach, and offers a public registration system for new inquiries.

---

## 2. User Roles

### 2.1 Admin (Owner)
- Full system access including all features
- Can delete leads
- Can import CSV data
- Can manage system settings
- Can add/remove staff members
- Can view analytics dashboard
- Access to sync Google Contacts

### 2.2 Staff
- View and edit leads
- Sync Google Contacts
- Send communications
- Cannot access: Analytics, Settings, Import, Staff Management
- Cannot delete leads

---

## 3. Lead Data Model

### 3.1 Basic Information
- Full name
- Phone number
- Email address
- Residential address
- Gender
- Date of birth
- Communication preference (WhatsApp/Email)

### 3.2 Academic Information
- Current grade/class
- Education board
- School/institute name
- Hobbies and interests

### 3.3 Family Information

**Father's Details:**
- Name
- Phone number
- Email (optional)
- Occupation

**Mother's Details:**
- Name
- Phone number
- Email (optional)
- Occupation

### 3.4 Business/Pipeline Information
- Lead source (Social Media, Website, Referral, Workshop, Other)
- Inquiry date
- Last follow-up date
- Source comments and internal notes
- Assigned test link

### 3.5 Counseling Information
- Appointment time (for 1:1 sessions)
- Calendar event ID (Google Calendar reference)
- Google Contact ID (for sync tracking)
- Registration token and security ID

### 3.6 Fees Information
- Payment status: Due / Paid / Waived / Bad debt
- Amount
- Payment mode
- Transaction ID

### 3.7 Tracking Information
- Current pipeline stage
- Status: Open / Won / Lost
- Stage timestamps (when entered each stage)
- Days in current stage

---

## 4. Pipeline Stages

The system uses a 9-stage pipeline:

| Stage | Description |
|-------|-------------|
| **New** | Initial inquiry received |
| **Registration Requested** | Registration form sent to lead |
| **Registration Done** | Lead completed registration form |
| **Test Sent** | Career assessment link sent |
| **Test Completed** | Lead completed assessment |
| **1:1 Scheduled** | Counseling session booked |
| **Session Complete** | Counseling session attended |
| **Report Sent** | Final report delivered to lead |
| **Lost** | Lead dropped off (archived view) |

---

## 5. User Flows - Detailed

### 5.1 Authentication Flow

**Entry:** User visits application URL

**Step 1 - Check Session**
- System checks for existing authenticated session
- If authenticated → redirect to Dashboard
- If not authenticated → display Login Screen

**Step 2 - Login Screen**
- Display branded login page with:
  - Application logo/title
  - GraduationCap icon
  - Product name: EduCompass CRM
  - Centered card layout on slate-50 background
  - **Sign in with Google** button (primary action)
- On button click → initiate Google OAuth flow

**Step 3 - OAuth Processing**
- Redirect to Google sign-in page
- User enters credentials
- Google returns auth code

**Step 4 - Role Assignment**
- System checks user's email against:
  - ADMIN_EMAILS list (config variable)
  - OWNER_EMAILS list (config variable)
  - Firestore users collection (for Staff)
- Assign role: Admin (if admin/owner) or Staff (if in users collection)

**Step 5 - Access Denied Scenario**
- If email not recognized → show error message
- Display **Sign in with Different Account** option
- User can retry with different Google credentials

**Step 6 - Success**
- Create session with user details and role
- Redirect to Dashboard (`/`)

---

### 5.2 Dashboard Main View Flow

**Entry:** After successful login

**Step 1 - Layout Load**
- Desktop: Fixed sidebar (72px) + scrollable main content
- Mobile: Bottom navigation bar + hamburger menu for sidebar

**Step 2 - Header Bar Display**
- Menu button (mobile only)
- Dynamic title based on active tab
- **EduCompass CRM** badge with Sparkles icon
- Action buttons (context-dependent by role):

| Button | Admin | Staff |
|--------|-------|-------|
| Sync Contacts | Yes | No |
| Import Leads | Yes | No |
| Add Lead | Yes | Yes |
| Settings | Yes | No |

**Step 3 - Tab Navigation**

Available tabs:
- **Leads** - Main pipeline view (default)
- **Today** - Today's appointments and birthdays
- **Templates** - Message template management
- **Lost** - Lost leads archive
- **Customers** - Won/completed leads
- **Analysis** - Admin only analytics (Staff redirected)

**Step 4 - Leads Tab (Default View)**

**Attention Required Section** (shown above pipeline):
- Displays leads needing action with amber-bordered cards
- Badge indicators:

| Badge | Meaning | Color |
|-------|---------|-------|
| Fees Due | Payment pending | Amber |
| Follow-up | Various stages needing follow-up | Amber |
| Nudge | Test sent but not completed | Amber |
| Ready | Registration done, ready for next step | Amber |
| Overdue | New lead > 4 days old | Red |

- Quick action buttons: Mark Paid, Follow up, Remind

**Search Bar:**
- Filters leads by name, phone, email
- Real-time filtering as user types
- Debounced at 300ms

**View Toggle:**
- Switch between **List view** and **Kanban view**
- Toggle button with visual indicator of current mode

**Stage Filter Dropdown:**
- Filter to show only leads in specific stage
- Includes **All Stages** option

**Step 5 - Today Tab**

**Section 1: Scheduled Appointments**
- Fetches from `/api/calendar/today`
- Lists all appointments for today
- Each appointment shows:
  - Event title
  - Time (or **All Day** if full day)
  - Description (truncated)
  - **Meet** button if Google Meet link exists
  - **Details** button for full info
- Empty state: **No appointments scheduled for today** card

**Section 2: Birthdays**
- Filters leads by date of birth matching today's date
- Lists birthday leads with:
  - Student name
  - Student ID
  - **Wish** button → opens WhatsApp with birthday message template
- Empty state: **No birthdays today** card

**Loading States:**
- Spinner shown while fetching data
- Contextual loading messages

**Step 6 - Templates Tab**

- List all message templates from database
- Each template shows name and preview
- Click to edit template content
- Template types supported:
  - Onboarding (registration form request)
  - Test (assessment link)
  - Test Nudge (follow-up on pending test)
  - Follow-up (general check-in, context-aware)
  - Community (WhatsApp group invite)
  - Review (Google review request)
  - Birthday (birthday wish)
  - Fees Reminder (payment reminder)
  - Report Email (career report delivery)

**Step 7 - Lost Tab**

- Shows all leads with **Lost** stage
- Search and filter available
- **Restore** action: Can restore lead by changing stage back to any non-Lost stage
- Display shows count of lost leads

**Step 8 - Customers Tab**

- Shows leads with **Report Sent** stage (won customers)
- Search and filter capabilities
- View-only (cannot edit stage to Lost)

**Step 9 - Analysis Tab (Admin Only)**

See Section 5.10

---

### 5.3 Lead Card Interaction Flow

**Entry:** User clicks on any lead card in Kanban or List view

**Step 1 - Open Lead Drawer**
- Drawer slides in from right
- Full height, max-width 2xl (672px)
- Semi-transparent backdrop
- Framer Motion animation for smooth slide

**Step 2 - Header Section**
- Lead name in header (editable inline, saves on blur)
- Subheader: Grade and Board display
- Stage selector dropdown at top (immediate save on change)

**Step 3 - Context-Aware Action Buttons**

Action buttons change dynamically based on current stage:

**Stage = New:**
- Send inquiry follow-up → opens WhatsApp with pre-filled message
- Send registration form → sends registration link via preferred channel
- Call → opens `tel:` link with lead's phone number

**Stage = Registration Requested:**
- Send registration follow-up reminder via WhatsApp/Email

**Stage = Registration Done:**
- Test link selector dropdown (11 options based on grade/board combinations)
- System auto-suggests appropriate test based on grade and board
- Send assessment link button

**Stage = Test Sent:**
- Nudge on test completion button → sends follow-up message
- Badge shows days since test sent

**Stage = Test Completed:**
- Book a 1:1 slot button → reveals slot picker component
- Send report & close button → opens Email Composer

**Stage = 1:1 Scheduled:**
- Shows appointment card with date/time
- Edit button → reopens slot picker
- Cancel button → removes appointment
- Mark session as complete button → advances stage to Session Complete
- Community invite button → sends group invite via WhatsApp
- Reschedule option → slot picker for new time

**Stage = Session Complete / Report Sent:**
- Prepare & Send Report button → opens Email Composer
- Ask Review button → sends review request via WhatsApp

**Step 4 - Collapsible Information Sections**

Five collapsible sections (all collapsed by default, click to expand):

**Section 1: Pipeline**
- Phone (editable)
- Email (editable)
- Inquiry date
- Source dropdown (Social Media, Website, Referral, Workshop, Other)
- Comments/notes textarea

**Section 2: Student Information**
- Contact details (phone, email, address)
- Grade and board
- School name
- Date of birth (date picker)
- Gender dropdown (Male/Female/Other)
- Communication preference toggle (WhatsApp preferred / Email preferred)

**Section 3: Family Information**
- Father's name, phone, email (optional), occupation
- Mother's name, phone, email (optional), occupation
- Clear labels for each field

**Section 4: Counseling & Assessment**
- Test link assigned
- Internal notes textarea
- Appointment time display (if scheduled)
- Calendar event ID (if linked)

**Section 5: Fees**
- Payment status selector (Due/Paid/Waived/Bad debt)
- Amount field (number)
- Payment mode (Cash, Card, UPI, Bank Transfer, Other)
- Transaction ID field

**Step 5 - Inline Editing Behavior**
- All text/number fields: save on blur (auto-save)
- Toggle switches: save immediately on change
- Stage changes: save immediately, lead moves to new column in Kanban

**Step 6 - Stage Change Rules**
- Moving to **Session Complete** → set lead status to **Won**
- Moving to **Report Sent** → set lead status to **Won**
- Moving away from **Won** status → revert status to **Open**

**Step 7 - Close Drawer**
- Click X button (top right)
- Click backdrop
- Press Escape key
- Return to dashboard with updated data visible

---

### 5.4 Calendar Booking Flow

**Entry:** User clicks **Book a 1:1 slot** button in LeadDrawer (when stage = Test Completed)

**Step 1 - Fetch Availability**
- Show loading state with spinner
- Query `/api/calendar/availability` endpoint
- Pass lead ID and session duration from settings

**Step 2 - Slot Picker Display**
- Renders after data loads
- Shows 90-minute slots for next 3 days
- Available hours: 9 AM to 9 PM
- Calendar visual shows:
  - Available slots (clickable, default cursor)
  - Busy slots (shown in red/grayed, labeled **Ev2**)
  - Selected slot (highlighted with border)

**Step 3 - Select Time Slot**
- User clicks an available slot
- Slot becomes selected (highlighted state)
- Previous selection cleared

**Step 4 - Time Adjustment**
- Selected slot shows:
  - **+15 min** button (push start time later)
  - **-15 min** button (pull start time earlier)
- Buttons adjust in 15-minute increments
- Ensures adjusted time still available

**Step 5 - Confirm Booking**
- User clicks **Send** or **Book** button
- System creates Google Calendar event via `/api/calendar/schedule`
- Google Meet link generated automatically
- Appointment stored in lead record (appointmentTime, calendarEventId)

**Step 6 - Display Confirmation**
- Lead card in pipeline shows appointment badge with time
- LeadDrawer shows appointment card with:
  - Date and time (formatted)
  - **Edit** button → reopens slot picker
  - **Cancel** button → removes appointment

**Error Handling:**
- If slot becomes busy during selection → show error message, refresh availability
- If calendar API fails → show error with retry option
- Network failure → show error, allow manual retry

---

### 5.5 Communication Flow (WhatsApp)

**Entry:** User clicks WhatsApp action button in LeadDrawer

**Step 1 - Determine Message Type**
- Based on current stage, select appropriate template:

| Stage | Template | Message Purpose |
|-------|----------|-----------------|
| New | onboarding | Initial registration form request |
| Registration Done | test | Send assessment link |
| Test Sent | test_nudge | Follow up on pending test |
| Various | followup | General check-in (context-aware) |
| Session Complete | community | Invite to WhatsApp group |
| Any | birthday | Birthday wish |

**Step 2 - Template Processing**
- Load template from Firestore templates collection
- Fall back to default messages if no custom template exists
- Replace placeholders:
  - `{name}` → lead's full name
  - `{url}` → registration link (onboarding/followup) or test link (test/test_nudge)
  - `{REGISTRATION_LINK}` → registration URL with token
  - `{TEST_LINK}` → assessment link
  - `{notes}` → lead's notes or fallback text

**Step 3 - Phone Number Processing**
- Take lead's phone number from lead data
- Strip non-digit characters (preserve + only)
- If 10 digits detected (Indian numbers) → prepend +91
- Format for wa.me URL: `https://wa.me/{number}?text={encoded_message}`

**Step 4 - Open WhatsApp**
- Open wa.me URL in new tab/window
- User's WhatsApp (app or web) opens with pre-filled message
- User reviews message content
- User sends manually (no automated sending)

**Step 5 - Record Communication**
- Update lastFollowUp timestamp on lead
- Log communication in lead history (if tracking implemented)

---

### 5.6 Email Composition Flow

**Entry:** User clicks email action or **Send report** button in LeadDrawer

**Step 1 - Open Email Composer Modal**
- Centered modal appears with backdrop
- Loading state while fetching templates
- Framer Motion fade-in animation

**Step 2 - Pre-filled Content**
- **Recipients** field auto-populated with:
  - lead.email
  - lead.fatherEmail (if exists)
  - lead.motherEmail (if exists)
  - Filter out empty/null values
  - Display as comma-separated list
- **Subject** line pre-filled based on template type
- **Body** pre-filled with template content and replaced placeholders

**Step 3 - Template Customization**
- User can edit subject line (text input)
- User can edit body (textarea, 10 rows default)
- Placeholders already replaced with actual values
- User can add personal touches

**Step 4 - Add Attachment (Optional)**
- Attachment zone below body
- Click to upload or drag-drop file
- Accept only PDF files
- Max file size: 3.5MB
- Shows file preview once selected:
  - Filename
  - File size
  - Remove button (X)
- Drag indicator shows drop zone

**Step 5 - Validation**
- Subject cannot be empty
- Body cannot be empty
- At least one recipient required
- File size check: max 3.5MB (show error if exceeded)
- File type check: only PDF accepted

**Step 6 - Send**
- Click **Send** button
- Show loading spinner during send
- Call `/api/email/send` endpoint

**Step 7 - Success/Error Handling**
- **On Success:**
  - Close modal
  - Trigger `onSuccess` callback (refresh data)
  - Show brief success feedback (optional toast)
- **On Failure:**
  - Show error in red alert box
  - Message: specific error details
  - Allow user to retry
  - Keep modal open

---

### 5.7 Public Registration Flow

**Entry:** Student/parent clicks registration link from WhatsApp/Email

**URL Format:** `https://domain.com/register/{token}?sid={securityId}`

**Step 1 - Validate Link**
- Show loading spinner
- Message: **Preparing your registration form...**

**Step 2 - Error Handling (Invalid Link)**
- If token invalid, expired, or lead not found:
- Display error card:
  - Icon: XCircle or similar
  - Heading: **Link Invalid**
  - Message: Please contact EduCompass for a new registration link
  - No form displayed

**Step 3 - Display Form**

Pre-fill fields where data already exists in lead record:
- Name, Phone, Email, Grade, Board, School

**Form Section 1: Student Details** (Card container)
- Full Name (text, pre-filled, required)
- Gender (dropdown: Male/Female/Other, pre-filled)
- Date of Birth (date picker, pre-filled, required)
- Contact Number (text, pre-filled, required)
- Email Address (email, pre-filled, required)
- Residential Address (textarea, pre-filled, required)

**Form Section 2: Academic Details** (Card container)
- Current Class/Grade (text, pre-filled, required)
- Education Board (text, pre-filled, required)
- School/Institute Name (text, pre-filled, required)
- Hobbies & Interests (textarea, optional)

**Form Section 3: Family Details** (Card container)
- Father's Name (text, required)
- Father's Phone (text, required)
- Father's Email (email, optional)
- Father's Occupation (text, optional)
- Mother's Name (text, required)
- Mother's Phone (text, required)
- Mother's Email (email, optional)
- Mother's Occupation (text, optional)

**Form Section 4: Additional Information** (Card container)
- Source (dropdown: Social Media, Website, Referral, Workshop, Other)
- Comments/Questions (textarea, optional)

**Form Section 5: Privacy Notice & Consent** (Card container)
- DPDP Act 2023 privacy notice text (displayed, read-only)
- Notice content explains:
  - Data collection purpose
  - Data usage
  - User rights
  - Contact for queries
- Consent checkbox: **I provide consent to process my data**
- Checkbox must be checked to enable Submit

**Step 4 - Client-side Validation**
- Required fields highlighted if empty on submit attempt
- Email format validation (regex)
- Date validation (DOB must be past date)
- Phone validation (minimum 10 digits)
- Error messages appear below each invalid field

**Step 5 - Submission**
- User clicks Submit button
- Button shows loading state
- POST to `/api/register/{token}`

**Step 6 - Success State**
- Checkmark animation (CheckCircle2 icon)
- Heading: **Thank You!**
- Confirmation message
- **Close Window** button

**Step 7 - Post-Submission Backend**
- Lead record updated:
  - privacyConsent: true
  - privacyConsentDate: timestamp
  - Stage auto-advanced (if configured)
- User closes browser tab or auto-redirect (if configured)

---

### 5.8 Import Flow (Admin Only)

**Entry:** Admin clicks **Import Leads** button in dashboard header

**Step 1 - Open Import Modal**
- Centered modal with backdrop
- Framer Motion fade-in animation
- Two large cards as import options

**Step 2 - Choose Import Type**

**Option Card 1: Google Contacts Sync**
- Icon: Users/sync icon
- Title: Google Contacts
- Description: Import leads from your Google Contacts
- Click to initiate

**Option Card 2: Upload CSV**
- Icon: File/spreadsheet icon
- Title: Upload CSV
- Description: Import leads from a CSV file
- Click to open file picker

---

### 5.8.1 Google Contacts Sync Path

**Step A1 - Fetch Contacts**
- Show loading state with spinner
- Message: Syncing contacts...
- Query Google Contacts API
- Fetch recent contacts:
  - 10 for manual trigger
  - 100 for cron trigger

**Step A2 - Filter Valid Contacts**
- Look for contacts with 6-digit date suffix (DDMMYY)
- Search fields: Name, Organization field, Bio/notes
- Example match: **John Sharma** with suffix **150425** in organization

**Step A3 - Create Leads**
- For each matching contact:
  - Extract name, phone, email
  - Check for duplicates (by Google Contact ID stored in lead)
  - Create new lead if not duplicate
  - Stage = New, Status = Open

**Step A4 - Display Results**
- Success: CheckCircle2 icon animation
- Message: **Contacts Synced!**
- Count: X new leads imported
- **Return to Dashboard** button

**Error Handling:**
- Quota exceeded → specific message about Google API limits
- Auth failure → redirect to re-authenticate
- Network error → show retry option

---

### 5.8.2 CSV Import Path

**Step B1 - File Selection**
- Click **Upload CSV** card
- File picker opens (accept: .csv files only)
- Max file size: 5MB
- If file too large → show error message

**Step B2 - Parse File**
- PapaParse library parses CSV
- Show row count after parsing
- Display file name and size

**Step B3 - Important Notice**
- Display reminder card:
  - Icon: AlertCircle
  - Title: Important
  - Message: Ensure your CSV has proper column headers matching field names
  - List of expected headers: Name, Phone, Email, Grade, Board, etc.

**Step B4 - Analyze CSV**
- Click **Analyze CSV Data** button
- Loading state
- POST to `/api/admin/import/analyze-csv`

**Step B5 - Review Analysis**
- Display analysis results:
  - Total leads count
  - Duplicates found count
  - Auto-detected column mappings (Name, Email, Phone, Grade, Stage)
  - Sample preview: first 3 rows
- Show mapping confirmation

**Step B6 - Duplicate Handling**
- Toggle selector:
  - **Skip duplicates** (recommended) - default
  - **Import Anyway** - imports all including duplicates
- Confirmation summary:
  - Final count to import
  - Duplicates to skip

**Step B7 - Execute Import**
- Click **Start Import Now** button
- Loading state with progress indicator
- POST to `/api/admin/import/execute`

**Step B8 - Success State**
- CheckCircle2 icon animation
- Heading: **Import Complete!**
- Success message with count: X leads imported
- **Return to Dashboard** button

**Error Handling:**
- Invalid CSV format → show parse error details
- File too large → show 5MB limit message
- Server error → show error with retry option

---

### 5.9 Settings Flow (Admin Only)

**Entry:** Admin clicks Settings icon (gear) in dashboard header

**Step 1 - Access Check**
- Verify current user has Admin role
- If Staff → show **Access Denied** modal:
  - Icon: ShieldX
  - Heading: Access Denied
  - Message: You don't have permission to access settings
  - **OK** button to close
  - Stop flow here

**Step 2 - Open Settings Modal**
- Centered modal with tabs
- Framer Motion fade-in animation
- Three tabs displayed in tab bar

---

**General Tab:**

**Section: Account Details**
- Display: Authorized Google email
- Display: System role (Admin badge)
- Read-only information

**Section: Scheduling Configuration**
- **Default Session Duration** dropdown:
  - 30 minutes
  - 60 minutes (default)
  - 90 minutes
  - 120 minutes
- **Calendar Lookahead** selector:
  - Range: 1-14 days
  - Default: 7 days
- Changes save immediately via API
- Show save confirmation (checkmark flash)

---

**Integrations Tab:**

**Section: Sync Status**
- Green banner: **Administrative Sync Active**
- Displays authorized account email

**Section: Health Checks**
- Google Contacts: Status indicator (green check / red X)
- Google Calendar: Status indicator
- Gmail: Status indicator
- **Refresh** button to re-check all
- Refresh shows loading state, then updates

---

**Staff Management Tab:**

**Section: Add New Staff**
- Email input field (placeholder: staff@email.com)
- **Add Staff** button
- POST to `/api/admin/staff`
- Success: add to list, clear input
- Error: show error message

**Section: Current Staff**
- List of staff members with:
  - Email address
  - Role badge (Staff)
  - **Remove** button (red, with confirmation dialog)
- DELETE to `/api/admin/staff?id={id}`
- Remove confirmation:
  - Modal: Remove staff member?
  - Confirm / Cancel buttons

**Step 3 - Close Modal**
- Click X button (top right)
- Click backdrop
- Settings saved immediately (no separate save button needed)

---

### 5.10 Analytics Flow (Admin Only)

**Entry:** Admin clicks **Analysis** tab in dashboard navigation

**Step 1 - Access Check**
- Verify current user has Admin role
- If Staff → redirect to Leads tab
- Show brief toast: Access denied

**Step 2 - Display Stats Cards**
Four stat cards in top row with grid layout:

**Card 1: Conversion Rate**
- Value: Won leads / Total leads
- Format: Percentage (e.g., 65%)
- Calculation: (wonCount / totalCount) * 100

**Card 2: Total Records**
- Value: Count of all leads
- Format: Number (e.g., 156)

**Card 3: Active Pipeline**
- Value: Open leads count
- Filter: Excludes Lost and Report sent stages
- Format: Number

**Card 4: Leads Lost**
- Value: Lost status count
- Format: Number

**Step 3 - Funnel Visualization**

**Header:** Pipeline Funnel

Three toggleable view modes (button group):
- **Bars** - Horizontal bars showing reached vs lost at each stage
- **Pyramid** - Stacked trapezoids with proportional widths
- **Steps** - Cards showing conversion percentage between each transition

**Funnel Stages (top to bottom):**
1. Inquiry (New stage)
2. Registration (Registration requested + Registration done)
3. Testing (Test sent + Test completed)
4. Counseling (1:1 scheduled + Session complete)
5. Won (Report sent)

**Bar View Details:**
- Each stage bar shows:
  - Stage name
  - Count reached
  - Count lost (if applicable)
  - Percentage of total

**Pyramid View Details:**
- Trapezoids stacked vertically
- Width proportional to conversion rate
- Labels on each section

**Steps View Details:**
- Cards between each stage transition
- Shows: Conversion % from one stage to next
- Color coding: Green (good), Yellow (warning), Red (poor)

**Step 4 - Stagnant Leads Section**

**Header:** Attention Required

- Definition: Leads in same stage > 7 days
- Display: Top 5 stagnant leads
- Each shows:
  - Lead name
  - Current stage
  - Days elapsed
  - Nudge badge (amber)
- If more than 5: Show count of additional (e.g., +3 more)

**Step 5 - Source Distribution**

**Header:** Lead Sources

- Horizontal bar chart
- Each bar represents one source:
  - Social Media
  - Website
  - Referral
  - Workshop
  - Other
- Bar shows:
  - Source name
  - Percentage of total
  - Count of leads
- Bars sorted by count (highest first)

**Step 6 - Insights Section**

**Card with dark background**

**Insight 1: Funnel Health**
- Analyzes drop-off rates between stages
- Identifies stage with highest drop-off
- Shows recommendation text

**Insight 2: Attention Needed**
- Count of stagnant leads
- Recommendation: Nudge stagnant leads
- Action suggestion

---

### 5.11 Add Lead Flow

**Entry:** User clicks **Add Lead** button in dashboard header

**Step 1 - Open Add Lead Modal**
- Centered modal with backdrop
- Framer Motion fade-in animation
- Form title: Add New Lead

**Step 2 - Enter Basic Info**

Form fields:
- Name (text, required)
- Phone (text, required)
- Email (email, optional)
- Grade/Class (text, optional)
- Board (text, optional)
- Source (dropdown: Social Media, Website, Referral, Workshop, Other)

**Step 3 - Validation**
- Name: Required, show error if empty
- Phone: Required, minimum 10 digits
- Email: Optional, but if entered must be valid format
- Show inline error messages below fields

**Step 4 - Create Lead**
- Click Submit button
- Loading state on button
- POST to `/api/leads`
- New lead created with:
  - Stage = New
  - Status = Open
  - Created timestamp
  - Modified timestamp

**Step 5 - Success**
- Modal closes
- New lead appears in pipeline (New column)
- Kanban view auto-scrolls to New column if needed

**Error Handling:**
- Server error → show error message, keep modal open
- Network error → show retry option

---

### 5.12 Search and Filter Flow

**Entry:** User interacts with search bar or stage filter on Leads tab

**Step 1 - Search Bar Interaction**

**Input field:**
- Placeholder: Search by name, phone, or email
- Search icon (magnifying glass) inside field
- Clear button (X) appears when text entered

**Behavior:**
- Real-time filtering as user types
- Debounced at 300ms
- Filters across: name, phone, email
- Case-insensitive matching

**Clear:**
- Click X button to clear search
- Instant clear, no debounce

**Step 2 - Stage Filter Dropdown**

**Dropdown options:**
- All Stages (default)
- New
- Registration Requested
- Registration Done
- Test Sent
- Test Completed
- 1:1 Scheduled
- Session Complete
- Report Sent

**Behavior:**
- Click to open dropdown
- Click option to select
- Dropdown closes on selection
- Immediately filters view

**Step 3 - Combined Filtering**
- Search and stage filter work together
- AND logic: both conditions must match
- Example: Search for **John** AND Stage = **New**
- Filters applied client-side for performance

**Step 4 - View State Persistence**
- Selected filters persist when switching tabs
- Filters reset on page reload
- URL params not used (client-side state)

---

### 5.13 View Toggle Flow (Kanban vs List)

**Entry:** User clicks view toggle button on Leads tab

**Step 1 - Toggle Button**
- Two-state button: List | Kanban
- Icon changes based on current view
- Active state highlighted

**Step 2 - Switch to Kanban View**
- Hide ListView
- Show KanbanView
- Leads organized into stage columns
- Horizontal scroll for columns
- Lead cards show: name, grade/board, days in stage, appointment badge

**Step 3 - Switch to List View**
- Hide KanbanView
- Show ListView
- Leads in table/row format
- Columns: Name, Phone, Stage, Status, Days, Actions
- Sortable columns (click header)
- Row click opens LeadDrawer

**Step 4 - Preserve State**
- Current view mode stored in React state
- Not persisted to server or URL
- Resets on page reload

---

### 5.14 Lost Lead Restoration Flow

**Entry:** User navigates to Lost tab and views lost leads

**Step 1 - Browse Lost Leads**
- List/table of all leads with Lost stage
- Shows same columns as main view
- Search and filter available

**Step 2 - Select Lead to Restore**
- Click on lead card/row
- Opens LeadDrawer (standard drawer flow)

**Step 3 - Change Stage**
- User changes stage dropdown from Lost to any other stage
- Available options: New, Registration Requested, Registration Done, etc.
- Stage change saves immediately

**Step 4 - Confirm Restoration**
- Lead status changes from Lost to Open
- Lead disappears from Lost tab
- Lead appears in appropriate stage column in main pipeline
- Success feedback (optional toast)

---

## 6. Key Features Summary

### 6.1 Lead Management
- Create, read, update, delete leads (delete: Admin only)
- 9-stage pipeline management
- Kanban and list view options
- Advanced search across name, phone, email
- Stage filtering
- Attention indicators for urgent actions
- Inline editing with auto-save

### 6.2 Google Integration
- OAuth 2.0 authentication via NextAuth
- Contacts sync (automatic via cron + manual trigger)
- Calendar integration for appointment scheduling
- Gmail integration for email delivery
- Delegated admin credentials for cross-user access

### 6.3 Communication Tools
- WhatsApp message generation with pre-filled text
- Email composition with attachments (PDF, max 3.5MB)
- Message templates (9 types) stored in database
- Placeholder substitution: {name}, {url}, {REGISTRATION_LINK}, {TEST_LINK}, {notes}
- Phone number formatting for Indian numbers (+91)
- Communication history tracking (lastFollowUp timestamp)

### 6.4 Public Portal
- Unique registration links per lead (token-based)
- Security ID validation (sid parameter)
- Multi-section registration form (5 sections)
- Pre-filled fields from existing lead data
- DPDP Act 2023 compliance with privacy notice
- Consent checkbox required before submission
- Automatic stage update on successful submission

### 6.5 Data Management
- CSV import with duplicate detection and handling
- Google Contacts import with date suffix filtering
- Column auto-detection for CSV mapping
- Batch operations (skip/import duplicates)
- Data maintenance: fix statuses, fix sheet structure

### 6.6 Access Control
- Role-based permissions (Admin/Staff)
- Admin-only sections protected with redirect
- Staff management for admins (add/remove)
- Configurable admin email list (environment variables)
- Session-based authentication with JWT

### 6.7 Analytics & Reporting
- Conversion rate calculation
- Funnel visualization (bars/pyramid/steps)
- Stage drop-off analysis
- Stagnant lead detection (>7 days)
- Source distribution analysis
- Active pipeline count
- Lost lead count

### 6.8 User Interface
- Dark mode support (next-themes)
- Responsive design (mobile-first)
- Desktop: sidebar navigation
- Mobile: bottom navigation + hamburger
- Framer Motion animations for overlays
- Lucide React icons throughout
- shadcn/ui-inspired component styling

---

## 7. UI/UX Patterns

### 7.1 Layout Patterns

**Desktop Layout:**
- Fixed sidebar (72px width) on left
- Scrollable main content area
- Header bar below sidebar, above content
- Maximum content width for readability

**Mobile Layout:**
- No sidebar (hidden)
- Bottom navigation bar (fixed, 56px height)
- Hamburger menu for additional options
- Full-width content area
- Touch-friendly tap targets (min 44px)

**Modal Patterns:**
- Centered in viewport
- Semi-transparent backdrop
- Max-width: sm (384px) for simple dialogs
- Max-width: lg (512px) for forms
- Max-width: 2xl (672px) for complex dialogs
- X button top-right for close

**Drawer Patterns:**
- Slides in from right
- Full height
- Max-width: 2xl (672px)
- Semi-transparent backdrop
- Close on backdrop click
- Close on Escape key

### 7.2 Navigation Structure

```
├── Login Screen (unauthenticated users only)
└── Dashboard (authenticated users)
    ├── Sidebar (desktop) / Bottom Nav (mobile)
    ├── Header with actions
    └── Main Content
        ├── Leads Tab (default)
        │   ├── Attention Required Section
        │   ├── Search Bar
        │   ├── View Toggle (List/Kanban)
        │   ├── Stage Filter
        │   └── Leads Grid/List
        ├── Today Tab
        │   ├── Appointments Section
        │   └── Birthdays Section
        ├── Templates Tab
        ├── Lost Tab
        ├── Customers Tab
        └── Analysis Tab (Admin only)
```

### 7.3 Overlay Hierarchy

When multiple overlays are open, they stack in this order (topmost closes first):

1. **EmailComposer** - Centered modal
2. **ImportModal** - Centered modal
3. **SettingsModal** - Centered modal
4. **AddLeadModal** - Centered modal
5. **LeadDrawer** - Right-side drawer

**Back Button Behavior:**
- Closes topmost overlay
- When no overlays remain, back button navigates to `/`
- Browser history integration for overlay state

### 7.4 Visual Design System

**Color Palette:**
- Primary: Blue (tailwind blue-600)
- Secondary: Slate (tailwind slate-?)
- Background: White/light gray
- Dark mode: Slate-900 background
- Accent: Amber for warnings/attention

**Stage Colors:**
- New: Blue
- Registration Requested: Cyan
- Registration Done: Teal
- Test Sent: Emerald
- Test Completed: Green
- 1:1 Scheduled: Lime
- Session Complete: Yellow
- Report Sent: Amber (won state)
- Lost: Red/gray

**Status Colors:**
- Open: Blue
- Won: Green
- Lost: Gray/Red

**Attention Badges:**
- Fees Due: Amber
- Follow-up: Amber
- Nudge: Amber
- Ready: Blue
- Overdue: Red

### 7.5 Responsive Breakpoints

- **sm:** 640px - Small tablets, large phones
- **md:** 768px - Tablets
- **lg:** 1024px - Small laptops
- **xl:** 1280px - Desktops
- **2xl:** 1536px - Large desktops

**Adaptations:**
- Below lg: Bottom navigation appears
- lg and above: Sidebar appears
- Cards stack vertically on mobile
- Tables become card-based on mobile
- Horizontal scroll for Kanban on mobile

---

## 8. Component Inventory

### 8.1 LoginScreen
- **States:** Default, Loading (during OAuth), Error (access denied)
- **Elements:** Logo, title, Google sign-in button, error message, retry button

### 8.2 Sidebar (Desktop)
- **States:** Expanded (default), collapsed (optional)
- **Elements:** Navigation items with icons, active indicator, user profile

### 8.3 BottomNav (Mobile)
- **States:** Default, with notification badges
- **Elements:** Tab icons, active indicator, hamburger menu trigger

### 8.4 LeadCard
- **States:** Default, hover, selected, attention needed
- **Elements:** Name, grade/board, days in stage badge, appointment time badge, stage color indicator

### 8.5 LeadDrawer
- **States:** Open, loading, error
- **Elements:** Header (name, stage), action buttons, collapsible sections, form fields

### 8.6 KanbanView
- **States:** Default, loading, empty
- **Elements:** Stage columns, lead cards, horizontal scroll

### 8.7 ListView
- **States:** Default, loading, empty, filtered
- **Elements:** Table/row layout, sortable headers, pagination (if needed)

### 8.8 AddLeadModal
- **States:** Default, loading, error, success
- **Elements:** Form fields, submit button, cancel button, validation messages

### 8.9 ImportModal
- **States:** Select type, Google sync loading, CSV upload, CSV analyze, CSV confirm, success, error
- **Elements:** Type cards, file picker, progress indicators, mappings display

### 8.10 SettingsModal
- **States:** Default, saving, error
- **Elements:** Tab bar, form fields, toggle switches, staff list

### 8.11 EmailComposer
- **States:** Default, loading, sending, success, error
- **Elements:** Recipients field, subject input, body textarea, attachment zone

### 8.12 SlotPicker
- **States:** Loading, ready, slot selected, booking, error
- **Elements:** Date selector, time slots grid, adjustment buttons, confirm button

### 8.13 TodayView
- **States:** Loading, has events, no events, has birthdays, no birthdays
- **Elements:** Appointments list, birthday list, meet buttons, wish buttons

### 8.14 TemplatesView
- **States:** Loading, has templates, empty
- **Elements:** Template cards, edit button, template editor

### 8.15 AnalysisView
- **States:** Loading, has data, empty
- **Elements:** Stat cards, funnel chart, stagnant leads list, source bars

### 8.16 RegistrationForm (Public)
- **States:** Loading, ready, submitting, success, error
- **Elements:** Multi-section form, validation messages, consent checkbox

---

## 9. Edge Cases and Error Handling

### 9.1 Authentication Errors

| Scenario | Handling |
|----------|----------|
| Unregistered email | Show access denied message with option to use different account |
| Session expired | Redirect to login screen |
| Network error during auth | Show retry option with error message |
| Google OAuth failure | Show error, allow retry |
| Invalid token | Redirect to login |

### 9.2 Data Validation

| Scenario | Handling |
|----------|----------|
| Empty required fields | Inline red text below field, prevent submit |
| Invalid email format | Show format hint below field |
| Invalid phone format | Auto-format Indian numbers or show error |
| Future date for DOB | Show validation error |
| File size exceeded | Show error before upload attempt |
| Invalid file type | Show accepted types message |

### 9.3 Calendar Conflicts

| Scenario | Handling |
|----------|----------|
| Slot becomes busy during selection | Show error, refresh availability grid |
| Double booking attempt | Prevent selection of busy slots (grayed out) |
| API failure | Show error message with retry button |
| No availability | Show message: No available slots, try different dates |

### 9.4 Import Errors

| Scenario | Handling |
|----------|----------|
| File too large (>5MB) | Show size limit message, reject file |
| Invalid CSV format | Show parse error details with line number |
| Google quota exceeded | Show specific message about Google limits |
| Duplicate entries | Handle based on user selection (skip/import) |
| Network failure during import | Show error with partial success count |

### 9.5 Communication Errors

| Scenario | Handling |
|----------|----------|
| WhatsApp not installed on device | Open web.whatsapp.com instead of wa.me |
| Email send failure | Show error in modal, allow retry |
| Missing recipient | Prevent send, highlight recipient field |
| Attachment too large | Show 3.5MB limit message |
| Invalid attachment type | Show PDF only message |

### 9.6 Network Errors

| Scenario | Handling |
|----------|----------|
| API timeout | Show timeout message with retry option |
| Offline state | Show offline indicator, disable submit buttons |
| Partial failure | Continue with successful items, report failures |
| Server error (5xx) | Show generic error, suggest retry later |

### 9.7 State Management Edge Cases

| Scenario | Handling |
|----------|----------|
| Lead deleted while drawer open | Close drawer, show toast notification |
| Stage changed in another tab | Refresh data, show update notification |
| Session expires while editing | Save draft to localStorage, prompt on return |
| Concurrent edits | Last write wins, no conflict resolution |

---

## 10. Accessibility Requirements

### 10.1 Keyboard Navigation
- All interactive elements focusable via Tab key
- Focus order follows visual layout
- Enter/Space activates buttons
- Escape closes modals and drawers
- Arrow keys navigate within dropdowns

### 10.2 Screen Reader Support
- Form fields have associated labels (htmlFor/id or aria-label)
- Error messages use aria-describedby
- Loading states announced (aria-busy)
- Modal has role=dialog and aria-modal=true
- Images have alt text (or empty alt for decorative)

### 10.3 Visual Accessibility
- Color contrast meets WCAG AA (4.5:1 for text)
- Focus indicators visible (outline on focus)
- No color-only indicators (icons/text supplement)
- Text resizable to 200% without loss

### 10.4 Form Accessibility
- Required fields marked with asterisk and aria-required
- Error messages linked to fields with aria-describedby
- Group related fields with fieldset/legend
- Logical tab order within forms

---

## 11. Future Considerations

The following features are planned or considered for future implementation:

### 11.1 AI Integration (Planned)
- Lead scoring and priority recommendations
- Automated follow-up scheduling suggestions
- Conversation tone suggestions
- Predictive conversion likelihood

### 11.2 Advanced Reporting
- Date range filters for analytics
- Export reports to PDF/CSV
- Scheduled email reports
- Comparison with previous periods

### 11.3 Mobile App
- Native iOS/Android app
- Push notifications for appointments
- Quick lead capture
- Offline mode with sync

### 11.4 Multi-language Support
- Language selector
- Translated UI
- Regional formatting (dates, numbers)

### 11.5 Enhanced Integrations
- More calendar providers (Outlook, Apple)
- SMS integration
- Video conferencing (Zoom, Teams)
- Payment gateway integration

---

## 12. Appendix: Environment Configuration

### 12.1 Required Environment Variables

**Authentication:**
- AUTH_SECRET - NextAuth secret
- GOOGLE_CLIENT_ID - Google OAuth client ID
- GOOGLE_CLIENT_SECRET - Google OAuth client secret

**Authorization:**
- ADMIN_EMAILS - Comma-separated admin email list
- OWNER_EMAILS - Comma-separated owner email list

**Google API:**
- GOOGLE_REFRESH_TOKEN - Delegated admin refresh token
- CRON_SECRET - Secret for cron endpoint authentication

**Firebase:**
- FIREBASE_SERVICE_ACCOUNT_KEY - JSON service account
- NEXT_PUBLIC_FIREBASE_PROJECT_ID - Public project ID

**Email:**
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS - Outgoing mail
- IMAP_HOST, IMAP_PORT, IMAP_SENT_FOLDER - Incoming mail (optional)

**AI (Planned):**
- GEMINI_API_KEY - Google Gemini API key

### 12.2 Default Session Settings
- Session duration: 30 days
- Session refresh: Enabled
- Secure cookies: Production only

---

*Document Version: 1.0*  
*Last Updated: April 2026*  
*Purpose: Feature parity specification for rebuilding EduCompass CRM*

---

## 13. Maintenance Rule

> **IMPORTANT:** This PRD.md must be kept synchronized with the codebase at all times.

### 13.1 When to Update

| Change Type | Action Required |
|-------------|----------------|
| New feature added | Document user flow, data model changes, and UI patterns |
| Feature modified | Update affected sections with new behavior |
| Feature removed | Mark as deprecated/removed, note version |
| User flow changed | Rewrite flow documentation |
| New role/permission | Update User Roles section |
| New pipeline stage | Update Pipeline Stages section |
| New integration | Add to Integrations section |
| UI pattern changed | Update Component Inventory and UI/UX Patterns |
| Bug fix (user-facing) | Update relevant user flow |

### 13.2 Update Process

1. **Before committing** any user-facing change, update the PRD.md
2. **Version bump** the document (patch for fixes, minor for additions, major for breaking changes)
3. **Changelog entry** in PR description must reference PRD updates

### 13.3 Ownership

- **Admin** is responsible for PRD.md accuracy
- Any contributor making user-facing changes must update this document

### 13.4 Quality Checklist

Before marking a PR complete, verify:
- [ ] All new user flows documented in Section 5
- [ ] Data model changes reflected in Section 3
- [ ] New components added to Section 8
- [ ] UI pattern changes updated in Section 7
- [ ] Version number updated