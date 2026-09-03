# Wireframes

## Career Tracking EduFlow IA V1

Source image: [career-tracking-eduflow-ia-v1.svg](career-tracking-eduflow-ia-v1.svg)

This wireframe places the school career-primer workflow inside the wider EduFlow application:

- School Programmes is a sibling module beside Leads, not part of the lead pipeline
- Schedule is the default School Programmes screen
- School Programmes contains Schedule, Coverage, Classes, and Programme Settings
- Institutions is a small shared master for school identity and contacts
- The same Institution Master can later support Partnerships without mixing partnership terms into the school programme records
- Careers remains a shared master used by school sessions and future recommendation flows

## Career Tracking Responsive Schedule V1

Source file: [career-tracking-responsive-schedule-v1.html](career-tracking-responsive-schedule-v1.html)

This wireframe translates the mobile schedule concept into EduFlow application context:

- Mobile keeps the simple schedule-first agenda shown in the earlier wireframe
- Desktop uses the same schedule list with a split session detail pane
- There is no School Programmes landing screen in the main workflow
- The existing filter icon opens filters that include School, academic year, grade, and status
- School Programmes remains a sibling module in the left navigation

## Career Tracking Cancel/Restore V1

Source image: [career-tracking-cancel-restore-v1.png](career-tracking-cancel-restore-v1.png)

This wireframe covers the V1 cancellation lifecycle for school counselling sessions:

- Cancel a session from Session Detail with an optional reason
- Keep cancelled sessions visible in the schedule as muted rows
- Allow Restore session before the scheduled calendar date has passed
- Keep planned careers attached to the cancelled session while it is restorable
- After the scheduled date passes, hide Restore session and carry planned careers forward
- Keep cancelled rows visible as historical schedule entries
