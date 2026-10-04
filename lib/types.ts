export type LeadStage = 
  | 'New' 
  | 'Registration requested' 
  | 'Registration done' 
  | 'Test sent' 
  | 'Test completed' 
  | '1:1 scheduled' 
  | 'Session complete' 
  | 'Report sent'
  | 'Lost';

export type LeadStatus = 'Open' | 'Won' | 'Lost';

export type FeesPaidStatus = 'Paid' | 'Due' | 'Waived' | 'Bad debt';
export type CommunityJoinedStatus = 'Yes' | 'No';

export enum UserRole {
  Admin = 'admin',
  Staff = 'staff',
}

export type DashboardTab =
  | 'leads'
  | 'today'
  | 'school-programmes'
  | 'careers'
  | 'partnerships'
  | 'templates'
  | 'lost'
  | 'analysis'
  | 'customers';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
}

export interface Lead {
  ownerUid: string;
  // Basic & System
  id: string;
  name: string;
  phone: string;
  email: string;
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  stage: LeadStage;
  status: LeadStatus;
  inquiryDate: string;
  updatedAt: string;
  lastStageUpdate?: string; // New field to track stage change duration
  googleContactId?: string;

  // From Registration Form
  address?: string;
  gender?: string;
  dob?: string;
  grade: string; // "Class" in form
  board: string;
  school?: string;
  hobbies?: string;
  
  // Family
  fatherName?: string;
  fatherPhone?: string;
  fatherEmail?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  motherEmail?: string;
  motherOccupation?: string;
  
  // Marketing & Discovery
  source?: string; // "How did you know about me?"
  comments?: string;

  // Counseling & Business
  notes: string; // Counseling notes
  lastFollowUp: string;
  followUpCount?: number;
  lastFollowUpOutcome?: string;
  nextFollowUpDate?: string;
  testLink: string;
  appointmentTime: string;
  feesPaid: FeesPaidStatus;
  feesAmount?: string;
  paymentMode?: string;
  transactionId?: string;
  reportSentDate: string;
  convertedDate: string;
  reportPdfUrl?: string;
  communityJoined: CommunityJoinedStatus;
  registrationToken?: string;
  registrationSid?: string;
  calendarEventId?: string;
  communicateViaEmailOnly?: boolean;
  privacy_consent?: boolean;
  privacy_consent_date?: string;
  primaryContactRecoveredAt?: string;
}

export const TEST_LINKS: Record<string, string> = {
  "2nd-7th": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as11",
  "8th-10th": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as12",
  "11th-12th": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as13",
  "Vocational": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/vas341",
  "Engineering": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as16",
  "Secondary (IB/IGCSE)": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as71",
  "High School (IBDP/A-level)": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as72",
  "Graduate": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as14",
  "Homemaker": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/hms341",
  "Professional": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as204",
  "Business Management": "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/Bm144"
};

export interface SystemSettings {
  defaultSessionDuration: 30 | 60 | 90 | 120;
  calendarLookaheadDays: number;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  defaultSessionDuration: 90,
  calendarLookaheadDays: 3,
};

export type ProgrammeCareerStatus = 'planned' | 'discussed';
export type ProgrammeSessionStatus = 'scheduled' | 'cancelled_restorable' | 'cancelled_passed' | 'completed';

export interface InstitutionContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface Institution {
  id: string;
  name: string;
  campus: string;
  address: string;
  status: 'active' | 'inactive';
  contacts: InstitutionContact[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgrammeClass {
  id: string;
  grade: 'IX' | 'X' | string;
  division: string;
  room: string;
  classTeacher: string;
}

export interface ProgrammeTimetableSlot {
  id: string;
  classId: string;
  grade: 'IX' | 'X' | string;
  division: string;
  room: string;
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  period: string;
  teacher: string;
  sourceImage: string;
}

export interface ProgrammeCareer {
  id: string;
  name: string;
  area: string;
  color: 'indigo' | 'green' | 'amber' | 'sky' | 'slate';
  status: ProgrammeCareerStatus;
  description: string;
  carriedForwardFrom?: string;
}

export interface ProgrammeSession {
  id: string;
  school: string;
  grade: 'IX' | 'X' | string;
  division: string;
  room: string;
  date: string;
  dateLabel: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  duration: string;
  period: string;
  teacher: string;
  status: ProgrammeSessionStatus;
  reason?: string;
  note?: string;
  carryForwardFrom?: string;
  timetableSlotId: string;
  careers: ProgrammeCareer[];
  calendarEventId?: string;
}

export interface SchoolProgramme {
  id: string;
  institutionId: string;
  institutionName: string;
  name: string;
  academicYear: string;
  status: 'active' | 'archived';
  classes: ProgrammeClass[];
  timetableSlots: ProgrammeTimetableSlot[];
  sessions: ProgrammeSession[];
  holidays: string[];
  careerCoverage: ProgrammeCareer[];
  sourceNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolProgrammeSchedule {
  institution: Institution;
  programme: SchoolProgramme;
}

// Shared careers master. Session-level career tracking (ProgrammeCareer) is
// still its own copy embedded per programme for now - not yet wired to read
// from this collection.
export interface Career {
  id: string;
  name: string;
  area: string;
  color: 'indigo' | 'green' | 'amber' | 'sky' | 'slate';
  description: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Partnerships: the commercial/admissions relationship with an Institution
// (MOU, commission terms, referral point of contact). Institution identity
// and general contacts stay on the shared Institution master above -
// Partnership only owns the terms and the referral point of contact, which
// may differ from Institution.contacts.
export type PartnershipStatus = 'Prospecting' | 'Active' | 'Inactive';

export interface Partnership {
  id: string;
  institutionId: string;
  institutionName: string; // denormalized for lists
  status: PartnershipStatus;
  pointOfContact: InstitutionContact;
  mouSigned: boolean;
  commissionTerms?: string; // free text, e.g. "10% of first-year tuition"
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// A single lead referred to a partner institution for admission, tracked
// through to commission outcome. Kept as its own top-level collection
// (rather than embedded on Partnership, the way SchoolProgramme embeds
// sessions) so it can be queried by due-date across every partnership and
// by lead.
export type ReferralStatus =
  | 'Referred'
  | 'Intimated'
  | 'Acknowledged'
  | 'Admitted'
  | 'Commission Due'
  | 'Commission Paid'
  | 'Declined';

export interface ReferralTimelineEntry {
  date: string;
  note: string;
  byUid: string;
}

export interface Referral {
  id: string;
  leadId: string;
  leadName: string; // denormalized
  partnershipId: string;
  institutionId: string;
  institutionName: string; // denormalized
  status: ReferralStatus;
  referredAt: string;
  referredBy: string;
  intimatedAt?: string;
  intimatedBy?: string;
  nextFollowUpDate?: string;
  lastFollowUpNote?: string;
  commissionAmount?: string;
  commissionStatus?: 'Pending' | 'Paid';
  timeline: ReferralTimelineEntry[];
  updatedAt: string;
}
