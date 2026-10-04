import 'server-only';

import {
  Lead,
  LeadStage,
  LeadStatus,
  FeesPaidStatus,
  CommunityJoinedStatus,
  UserRole,
  SystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
  Institution,
  InstitutionContact,
  ProgrammeCareer,
  ProgrammeCareerStatus,
  ProgrammeSession,
  ProgrammeSessionStatus,
  SchoolProgramme,
  SchoolProgrammeSchedule,
  Career,
  Partnership,
  PartnershipStatus,
  Referral,
  ReferralStatus,
  ReferralTimelineEntry,
} from './types';
import { compareDateValuesDesc, generateRegistrationSid, generateRegistrationToken, isLostLead, safeFormat } from './utils';
import { adminDb } from './server-firebase';
import { EDUCOMPASS_LOCATION_MAP_URL, EDUCOMPASS_LOCATION_PIN } from './messaging-utils';
import { buildProgrammeSessionEventBody, upsertProgrammeSessionEvent, programmeSessionDisplayTimeTo24Hour } from './calendar';

const LEADS_COLLECTION = 'leads';
const TEMPLATES_COLLECTION = 'templates';
const USERS_COLLECTION = 'users';
const INSTITUTIONS_COLLECTION = 'institutions';
const SCHOOL_PROGRAMMES_COLLECTION = 'school_programmes';
const DEFAULT_SCHOOL_PROGRAMME_ID = 'gundecha-2026-27-career-primer';
const PROGRAMME_ID_PATTERN = /^[a-z0-9-]+$/;
const CAREERS_COLLECTION = 'careers';
const CAREER_COLORS: Career['color'][] = ['indigo', 'green', 'amber', 'sky', 'slate'];
const PARTNERSHIPS_COLLECTION = 'partnerships';
const REFERRALS_COLLECTION = 'referrals';

interface LeadDocument extends Omit<Lead, 'id'> {
  id?: string; // Firestore document ID
}

interface TemplateDocument {
  id: string;
  label: string;
  subject: string;
  message: string;
}

// Helper to convert Firestore DocumentData to Lead type
const mapDocToLead = (doc: FirebaseFirestore.DocumentData): Lead => {
  return {
    id: doc.id,
    ownerUid: doc.ownerUid,
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    studentName: doc.studentName,
    studentPhone: doc.studentPhone,
    studentEmail: doc.studentEmail,
    stage: doc.stage,
    status: doc.status,
    inquiryDate: doc.inquiryDate,
    updatedAt: doc.updatedAt,
    lastStageUpdate: doc.lastStageUpdate,
    googleContactId: doc.googleContactId,
    address: doc.address,
    gender: doc.gender,
    dob: doc.dob,
    grade: doc.grade,
    board: doc.board,
    school: doc.school,
    hobbies: doc.hobbies,
    fatherName: doc.fatherName,
    fatherPhone: doc.fatherPhone,
    fatherEmail: doc.fatherEmail,
    fatherOccupation: doc.fatherOccupation,
    motherName: doc.motherName,
    motherPhone: doc.motherPhone,
    motherEmail: doc.motherEmail,
    motherOccupation: doc.motherOccupation,
    source: doc.source,
    comments: doc.comments,
    notes: doc.notes,
    lastFollowUp: doc.lastFollowUp,
    followUpCount: doc.followUpCount || 0,
    lastFollowUpOutcome: doc.lastFollowUpOutcome || '',
    nextFollowUpDate: doc.nextFollowUpDate || '',
    testLink: doc.testLink,
    appointmentTime: doc.appointmentTime,
    feesPaid: doc.feesPaid,
    feesAmount: doc.feesAmount,
    paymentMode: doc.paymentMode,
    transactionId: doc.transactionId,
    reportSentDate: doc.reportSentDate,
    convertedDate: doc.convertedDate,
    reportPdfUrl: doc.reportPdfUrl,
    communityJoined: doc.communityJoined,
    registrationToken: doc.registrationToken,
    registrationSid: doc.registrationSid,
    calendarEventId: doc.calendarEventId,
    communicateViaEmailOnly: doc.communicateViaEmailOnly,
    privacy_consent: doc.privacy_consent,
    privacy_consent_date: doc.privacy_consent_date,
    primaryContactRecoveredAt: doc.primaryContactRecoveredAt,
  };
};

// Helper to convert Lead type to Firestore DocumentData
const mapLeadToDoc = (lead: Partial<Lead>): LeadDocument => {
  const doc: LeadDocument = {
    ownerUid: lead.ownerUid || '',
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    studentName: lead.studentName || '',
    studentPhone: lead.studentPhone || '',
    studentEmail: lead.studentEmail || '',
    stage: lead.stage || 'New',
    status: lead.status || 'Open',
    inquiryDate: lead.inquiryDate || safeFormat(new Date()),
    updatedAt: lead.updatedAt || safeFormat(new Date()),
    lastStageUpdate: lead.lastStageUpdate || '',
    googleContactId: lead.googleContactId || '',
    address: lead.address || '',
    gender: lead.gender || '',
    dob: lead.dob || '',
    grade: lead.grade || '',
    board: lead.board || '',
    school: lead.school || '',
    hobbies: lead.hobbies || '',
    fatherName: lead.fatherName || '',
    fatherPhone: lead.fatherPhone || '',
    fatherEmail: lead.fatherEmail || '',
    fatherOccupation: lead.fatherOccupation || '',
    motherName: lead.motherName || '',
    motherPhone: lead.motherPhone || '',
    motherEmail: lead.motherEmail || '',
    motherOccupation: lead.motherOccupation || '',
    source: lead.source || '',
    comments: lead.comments || '',
    notes: lead.notes || '',
    lastFollowUp: lead.lastFollowUp || '',
    testLink: lead.testLink || '',
    appointmentTime: lead.appointmentTime || '',
    feesPaid: lead.feesPaid || 'Due',
    feesAmount: lead.feesAmount || '',
    paymentMode: lead.paymentMode || '',
    transactionId: lead.transactionId || '',
    reportSentDate: lead.reportSentDate || '',
    convertedDate: lead.convertedDate || '',
    reportPdfUrl: lead.reportPdfUrl || '',
    communityJoined: lead.communityJoined || 'No',
    registrationToken: lead.registrationToken || generateRegistrationToken(),
    registrationSid: lead.registrationSid || generateRegistrationSid(),
    calendarEventId: lead.calendarEventId || '',
    communicateViaEmailOnly: lead.communicateViaEmailOnly || false,
    privacy_consent: lead.privacy_consent || false,
    privacy_consent_date: lead.privacy_consent_date || '',
    primaryContactRecoveredAt: lead.primaryContactRecoveredAt || '',
  };
  return doc;
};

// Helper to chunk arrays for Firestore batches (max 500 operations)
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Lead Functions
export async function getLeadCounts(callerUid: string, role: UserRole): Promise<{ 
  pipeline: number; 
  customers: number; 
  feesPending: number;
  stages: Record<string, number>;
}> {
  let baseQuery: FirebaseFirestore.Query = adminDb.collection(LEADS_COLLECTION);

  if (role !== UserRole.Admin && role !== UserRole.Staff) {
    baseQuery = baseQuery.where('ownerUid', '==', callerUid);
  }

  const STAGES: LeadStage[] = [
    'New', 'Registration requested', 'Registration done', 'Test sent', 'Test completed',
    '1:1 scheduled', 'Session complete', 'Report sent'
  ];

  // Fetch counts for all stages in parallel. Lost is a status, so stage counts
  // subtract leads marked Lost while preserving the stage where they dropped.
  const [stageSnapshots, lostStageSnapshots, legacyLostSnapshot, feesPendingSnapshots, lostFeesPendingSnapshots] = await Promise.all([
    Promise.all(STAGES.map(stage => baseQuery.where('stage', '==', stage).count().get())),
    Promise.all(STAGES.map(stage => baseQuery.where('stage', '==', stage).where('status', '==', 'Lost').count().get())),
    baseQuery.where('stage', '==', 'Lost').count().get(),
    Promise.all(
      (['1:1 scheduled', 'Session complete'] as LeadStage[]).map(stage =>
        baseQuery.where('stage', '==', stage).where('feesPaid', '==', 'Due').count().get()
      )
    ),
    Promise.all(
      (['1:1 scheduled', 'Session complete'] as LeadStage[]).map(stage =>
        baseQuery.where('stage', '==', stage).where('feesPaid', '==', 'Due').where('status', '==', 'Lost').count().get()
      )
    ),
  ]);

  const stageCounts: Record<string, number> = {};
  STAGES.forEach((stage, i) => {
    const totalAtStage = stageSnapshots[i].data().count;
    const lostAtStage = lostStageSnapshots[i].data().count;
    stageCounts[stage] = Math.max(totalAtStage - lostAtStage, 0);
  });
  stageCounts['Lost'] = legacyLostSnapshot.data().count;

  const pipeline = STAGES
    .filter(s => s !== 'Report sent')
    .reduce((sum, s) => sum + stageCounts[s], 0);

  return {
    pipeline,
    customers: stageCounts['Report sent'] || 0,
    feesPending: Math.max(
      feesPendingSnapshots.reduce((sum, snapshot) => sum + snapshot.data().count, 0) -
        lostFeesPendingSnapshots.reduce((sum, snapshot) => sum + snapshot.data().count, 0),
      0
    ),
    stages: stageCounts,
  };
}

export async function getAllLeads(
  callerUid: string, 
  role: UserRole, 
  options?: { limit?: number; lastId?: string; summary?: boolean; category?: 'pipeline' | 'customers' | 'lost' }
): Promise<Lead[]> {
  let leadsRef: FirebaseFirestore.Query = adminDb.collection(LEADS_COLLECTION);

  // Staff can see all leads (but cannot delete)
  // Only true Admins get special treatment for other operations
  if (role !== UserRole.Admin && role !== UserRole.Staff) {
    leadsRef = leadsRef.where('ownerUid', '==', callerUid);
  }

  // Filter by category if provided
  if (options?.category === 'pipeline') {
    // Pipeline is anything that's NOT Lost and NOT Report sent
    leadsRef = leadsRef.where('stage', 'not-in', ['Lost', 'Report sent']);
  } else if (options?.category === 'customers') {
    // For customers, we fetch everything matching the stage and sort in JS
    // to avoid a complex composite index requirement.
    leadsRef = leadsRef.where('stage', '==', 'Report sent');
  } else if (options?.category === 'lost') {
    const [statusLostSnapshot, legacyStageLostSnapshot] = await Promise.all([
      leadsRef.where('status', '==', 'Lost').get(),
      leadsRef.where('stage', '==', 'Lost').get(),
    ]);

    const docsById = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    statusLostSnapshot.docs.forEach(doc => docsById.set(doc.id, doc));
    legacyStageLostSnapshot.docs.forEach(doc => docsById.set(doc.id, doc));

    const leads = Array.from(docsById.values()).map(doc => {
      const data = doc.data();
      if (options?.summary) {
        return {
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          studentName: data.studentName || '',
          studentPhone: data.studentPhone || '',
          studentEmail: data.studentEmail || '',
          stage: data.stage || 'New',
          status: data.status || 'Open',
          feesPaid: data.feesPaid || 'Due',
          updatedAt: data.updatedAt || '',
          grade: data.grade || '',
          board: data.board || '',
          inquiryDate: data.inquiryDate || '',
          address: data.address || '',
          gender: data.gender || '',
          dob: data.dob || '',
          school: data.school || '',
          hobbies: data.hobbies || '',
          fatherName: data.fatherName || '',
          fatherPhone: data.fatherPhone || '',
          fatherEmail: data.fatherEmail || '',
          fatherOccupation: data.fatherOccupation || '',
          motherName: data.motherName || '',
          motherPhone: data.motherPhone || '',
          motherEmail: data.motherEmail || '',
          motherOccupation: data.motherOccupation || '',
          source: data.source || '',
          comments: data.comments || '',
          notes: data.notes || '',
          lastFollowUp: data.lastFollowUp || '',
          followUpCount: data.followUpCount || 0,
          lastFollowUpOutcome: data.lastFollowUpOutcome || '',
          nextFollowUpDate: data.nextFollowUpDate || '',
          testLink: data.testLink || '',
          reportPdfUrl: data.reportPdfUrl || '',
          feesAmount: data.feesAmount || '',
          paymentMode: data.paymentMode || '',
          transactionId: data.transactionId || '',
          registrationToken: data.registrationToken || '',
          registrationSid: data.registrationSid || '',
          calendarEventId: data.calendarEventId || '',
          appointmentTime: data.appointmentTime || '',
          communityJoined: data.communityJoined || 'No',
          communicateViaEmailOnly: data.communicateViaEmailOnly || false,
          lastStageUpdate: data.lastStageUpdate || '',
          privacy_consent: data.privacy_consent || false,
          privacy_consent_date: data.privacy_consent_date || '',
          primaryContactRecoveredAt: data.primaryContactRecoveredAt || '',
        } as Lead;
      }
      return mapDocToLead({ ...data, id: doc.id });
    });

    return leads.sort((a, b) => compareDateValuesDesc(a.updatedAt, b.updatedAt));
  } else {
    // Default fallback ordering
    leadsRef = leadsRef.orderBy('updatedAt', 'desc');
  }

  // Only apply ordering and pagination at the DB level for categories that don't use inequality filters
  // OR if we have the necessary composite indexes.
  // Pipeline and Customers will be handled in JS for sorting to be safe.
  if (options?.category !== 'pipeline' && options?.category !== 'customers') {
    if (options?.lastId) {
      const lastDoc = await adminDb.collection(LEADS_COLLECTION).doc(options.lastId).get();
      if (lastDoc.exists) {
        leadsRef = leadsRef.startAfter(lastDoc);
      }
    }

    if (options?.limit) {
      leadsRef = leadsRef.limit(options.limit);
    }
  }

  const snapshot = await leadsRef.get();
  let leads = snapshot.docs.map(doc => {
    const data = doc.data();
    if (options?.summary) {
      // Return essential fields for list view + all drawer/registration fields
      return {
        id: doc.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        studentName: data.studentName || '',
        studentPhone: data.studentPhone || '',
        studentEmail: data.studentEmail || '',
        stage: data.stage || 'New',
        status: data.status || 'Open',
        feesPaid: data.feesPaid || 'Due',
        updatedAt: data.updatedAt || '',
        grade: data.grade || '',
        board: data.board || '',
        inquiryDate: data.inquiryDate || '',
        address: data.address || '',
        gender: data.gender || '',
        dob: data.dob || '',
        school: data.school || '',
        hobbies: data.hobbies || '',
        fatherName: data.fatherName || '',
        fatherPhone: data.fatherPhone || '',
        fatherEmail: data.fatherEmail || '',
        fatherOccupation: data.fatherOccupation || '',
        motherName: data.motherName || '',
        motherPhone: data.motherPhone || '',
        motherEmail: data.motherEmail || '',
        motherOccupation: data.motherOccupation || '',
        source: data.source || '',
        comments: data.comments || '',
        notes: data.notes || '',
        lastFollowUp: data.lastFollowUp || '',
        followUpCount: data.followUpCount || 0,
        lastFollowUpOutcome: data.lastFollowUpOutcome || '',
        nextFollowUpDate: data.nextFollowUpDate || '',
        testLink: data.testLink || '',
        reportPdfUrl: data.reportPdfUrl || '',
        feesAmount: data.feesAmount || '',
        paymentMode: data.paymentMode || '',
        transactionId: data.transactionId || '',
        registrationToken: data.registrationToken || '',
        registrationSid: data.registrationSid || '',
        calendarEventId: data.calendarEventId || '',
        appointmentTime: data.appointmentTime || '',
        communityJoined: data.communityJoined || 'No',
        communicateViaEmailOnly: data.communicateViaEmailOnly || false,
        lastStageUpdate: data.lastStageUpdate || '',
        privacy_consent: data.privacy_consent || false,
        privacy_consent_date: data.privacy_consent_date || '',
        primaryContactRecoveredAt: data.primaryContactRecoveredAt || '',
      } as Lead;
    }
    return mapDocToLead({ ...data, id: doc.id });
  });

  if (options?.category === 'pipeline') {
    leads = leads.filter(lead => !isLostLead(lead));
  } else if (options?.category === 'customers') {
    leads = leads.filter(lead => !isLostLead(lead));
  }

  // Performance optimization: Sort in JS for categories that would otherwise require complex indexes
  if (options?.category === 'pipeline' || options?.category === 'customers') {
    const sorted = leads.sort((a, b) => compareDateValuesDesc(a.updatedAt, b.updatedAt));
    
    // For customers, we simulate lazy loading by returning only the requested slice
    // This allows the frontend to keep its lazy-loading logic while the server handles the full set in memory
    if (options?.category === 'customers' && options?.limit) {
      // In this mode, lastId is an index or we just return the first slice
      // Since we fetch everything on the server, we just return the first 'limit' items
      // The frontend will receive 1000 items anyway if we don't slice, but let's be efficient.
      // Wait, if I slice, I lose the ability to "load more" unless I know the lastId.
      
      // Actually, since we are in summary mode, returning all 1000 is safer and fast.
      return sorted;
    }
    
    return sorted;
  }

  return leads;
}

export async function addLeads(callerUid: string, role: UserRole, leads: Partial<Lead>[]): Promise<string[]> {
  if (leads.length === 0) return [];
  const chunks = chunkArray(leads, 500);
  const newLeadIds: string[] = [];

  for (const chunk of chunks) {
    const batch = adminDb.batch();
    chunk.forEach(lead => {
      const docRef = adminDb.collection(LEADS_COLLECTION).doc();
      const leadData = mapLeadToDoc({ ...lead, ownerUid: callerUid, updatedAt: safeFormat(new Date()) });
      batch.set(docRef, leadData);
      newLeadIds.push(docRef.id);
    });
    await batch.commit();
  }

  return newLeadIds;
}

export async function updateLeads(callerUid: string, role: UserRole, updates: { id: string; data: Partial<Lead> }[]): Promise<void> {
  if (updates.length === 0) return;
  
  // Authorization check (caller-based, not document-based)
  if (role !== UserRole.Admin && role !== UserRole.Staff) {
    throw new Error('Unauthorized: You do not have permission to update leads.');
  }

  const chunks = chunkArray(updates, 500);
  for (const chunk of chunks) {
    const batch = adminDb.batch();
    chunk.forEach(update => {
      const docRef = adminDb.collection(LEADS_COLLECTION).doc(update.id);
      const updatedData = { ...update.data, updatedAt: safeFormat(new Date()) };
      batch.update(docRef, updatedData);
    });
    await batch.commit();
  }
}

export async function deleteLead(callerUid: string, role: UserRole, leadId: string): Promise<void> {
  if (role !== UserRole.Admin) {
    throw new Error('Unauthorized: Only admins can delete leads.');
  }
  const docRef = adminDb.collection(LEADS_COLLECTION).doc(leadId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return; // Lead not found, nothing to delete
  }

  await docRef.delete();
}

export async function deleteAllLeads(callerUid: string, role: UserRole): Promise<{ deleted: number }> {
  if (role !== UserRole.Admin) {
    throw new Error('Unauthorized: Only admins can delete leads.');
  }

  let deleted = 0;

  while (true) {
    const snapshot = await adminDb.collection(LEADS_COLLECTION).limit(450).get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    deleted += snapshot.size;
  }

  return { deleted };
}

export async function getLeadByRegistrationAccess(registrationToken: string, registrationSid?: string | null): Promise<Lead | null> {
  const snapshot = await adminDb.collection(LEADS_COLLECTION).where('registrationToken', '==', registrationToken).get();

  if (snapshot.empty) {
    return null;
  }

  const matchingDoc = snapshot.docs.find((doc) => {
    const docSid = doc.data().registrationSid;
    return !docSid || docSid === registrationSid;
  });

  if (!matchingDoc) {
    return null;
  }

  return mapDocToLead({ ...matchingDoc.data(), id: matchingDoc.id });
}

export async function consumeRegistrationLink(
  registrationToken: string,
  registrationSid: string | null,
  updates: Partial<Lead>
): Promise<void> {

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      adminDb.collection(LEADS_COLLECTION).where('registrationToken', '==', registrationToken)
    );

    if (snapshot.empty) {
      throw new Error('Invalid registration link');
    }

    const matchingDoc = snapshot.docs.find((doc) => {
      const docSid = doc.data().registrationSid;
      return !docSid || docSid === registrationSid;
    });

    if (!matchingDoc) {
      throw new Error('Invalid registration link');
    }

    const docData = matchingDoc.data();
    if (!docData.registrationToken) {
      throw new Error('Registration link has already been used');
    }

    const currentSid = docData.registrationSid;
    if (currentSid && currentSid !== registrationSid) {
      throw new Error('Invalid registration link');
    }

    transaction.update(matchingDoc.ref, {
      ...updates,
      updatedAt: safeFormat(new Date()),
      registrationToken: '',
      registrationSid: '',
    });
  });
}

// Template Functions
const DEFAULT_TEMPLATES = [
  { id: 'onboarding', label: 'Onboarding Message', subject: 'Registration Form - EduCompass Career Counseling', message: 'Hi {name}, this is Binal from EduCompass. Great to have you onboard! Please fill this registration form to share student details: [REGISTRATION_LINK]' },
  { id: 'test', label: 'Assessment Link', subject: 'Career Assessment Link - {name}', message: 'Hi {name}, based on your details, here is the career assessment link: {url}. Please complete this before our 1:1 session.' },
  { id: 'test_nudge', label: 'Test Nudge', subject: 'Reminder: Career Assessment Pending', message: 'Hi {name}, hope you are doing well. Just a gentle nudge to complete the career assessment test so we can proceed with our 1:1 counseling session. Link: {url}' },
  { id: 'followup', label: 'Follow-up Message', subject: 'Follow-up: Career Counseling Inquiry', message: 'Hi {name}, just checking in regarding your career counseling inquiry. Do you have any questions I can help with?' },
  { id: 'community', label: 'Community Invite', subject: 'Invitation: EduCompass Parents Community', message: "Hi {name}, I'd like to invite you to the EduCompass Parents WhatsApp Community where I share important updates and form filling dates: https://chat.whatsapp.com/example-group-link" },
  { id: 'review', label: 'Google Review Request', subject: 'How was your session? - Feedback Request', message: 'Hi {name}, it was a pleasure counseling you. If you found the session helpful, I\'d really appreciate a quick review on Google: [YOUR_GOOGLE_REVIEW_LINK]' },
  { id: 'birthday', label: 'Birthday Wish', subject: 'Happy Birthday {studentName}! 🎂', message: 'Hi {name}, please wish {studentName} a very Happy Birthday! 🎂 Hope they have a fantastic day ahead! - Binal from EduCompass' },
  { id: 'report_email', label: 'Report Email', subject: '{studentName} - Career Counseling Report', message: "Dear Parent,\n\nPlease find attached the career counseling report for {studentName}.\n\nBased on our 1:1 session, we discussed the following career choices and recommendations:\n{notes}\n\n[PLEASE ATTACH THE PDF DOWNLOADED FROM EDUMILESTONES]\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nBinal\nFounder, EduCompass" },
  { id: 'fees_reminder', label: 'Fees Reminder', subject: 'Professional Fees Reminder - EduCompass', message: 'Hi {name}, just a gentle reminder regarding the professional fees for the career counseling session. Please ignore if already paid. Thanks!' },
  { id: 'location', label: 'EduCompass Location', subject: 'EduCompass Location', message: `Hi {name}, sharing the EduCompass location for your visit.\n\nAddress: EduCompass, Mumbai, Maharashtra\nPin: ${EDUCOMPASS_LOCATION_PIN}\nGoogle Maps: ${EDUCOMPASS_LOCATION_MAP_URL}` },
];

export async function ensureDefaultTemplates() {
  const refs = DEFAULT_TEMPLATES.map(template =>
    adminDb.collection(TEMPLATES_COLLECTION).doc(template.id)
  );
  // Read and create atomically so recovery cannot overwrite a concurrent edit.
  await adminDb.runTransaction(async transaction => {
    const snapshots = await transaction.getAll(...refs);
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        transaction.create(snapshot.ref, DEFAULT_TEMPLATES[index]);
      }
    });
  });
}

export async function getTemplates(): Promise<TemplateDocument[]> {
  await ensureDefaultTemplates(); // Ensure defaults are present
  const snapshot = await adminDb.collection(TEMPLATES_COLLECTION).get();
  return snapshot.docs.map(doc => doc.data() as TemplateDocument);
}

export async function updateTemplate(callerUid: string, role: UserRole, templateId: string, updates: { subject?: string; message?: string }): Promise<void> {
  if (role !== UserRole.Admin) {
    throw new Error('Unauthorized: Only admins can update templates.');
  }
  const docRef = adminDb.collection(TEMPLATES_COLLECTION).doc(templateId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error(`Template with ID ${templateId} not found`);
  }

  await docRef.update(updates);
}

// User Role & Staff Functions
export async function getUserRole(email: string): Promise<UserRole | null> {
  try {
    const snapshot = await adminDb.collection(USERS_COLLECTION)
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data().role as UserRole;
  } catch (error) {
    console.error('Failed to get user role from Firestore:', error);
    return null;
  }
}

export async function getStaffMembers(): Promise<{ id: string, email: string, role: UserRole }[]> {
  const snapshot = await adminDb.collection(USERS_COLLECTION)
    .where('role', '==', UserRole.Staff)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    email: doc.data().email,
    role: doc.data().role as UserRole
  }));
}

export async function addStaff(email: string): Promise<string> {
  const emailLower = email.toLowerCase().trim();
  
  // Check if already exists
  const existing = await adminDb.collection(USERS_COLLECTION)
    .where('email', '==', emailLower)
    .get();
  
  if (!existing.empty) {
    throw new Error('User already exists');
  }

  const docRef = await adminDb.collection(USERS_COLLECTION).add({
    email: emailLower,
    role: UserRole.Staff,
    createdAt: safeFormat(new Date())
  });
  
  return docRef.id;
}

export async function removeStaff(userId: string): Promise<void> {
  await adminDb.collection(USERS_COLLECTION).doc(userId).delete();
}

const SETTINGS_COLLECTION = 'system_settings';
const SETTINGS_DOC_ID = 'global';

export async function getSystemSettings(): Promise<SystemSettings> {
  const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
  
  if (!doc.exists) {
    // Initialize with defaults
    await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(DEFAULT_SYSTEM_SETTINGS);
    return DEFAULT_SYSTEM_SETTINGS;
  }
  
  return doc.data() as SystemSettings;
}

export async function updateSystemSettings(updates: Partial<SystemSettings>): Promise<void> {
  await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(updates, { merge: true });
}

// NOTE: all of a programme's sessions live in one `sessions` array field on a
// single school_programmes document, so every cancel/restore/career edit does
// a full read-modify-write of the whole array (see updateSchoolProgrammeSession
// below). That's fine at today's scale (~1 programme, ~260 sessions/year), but
// won't hold up if programmes or schools multiply - a session gains a Firestore
// 1MB document ceiling shared with every other session, and concurrent edits
// to different sessions still serialize through the same document. Splitting
// sessions into their own subcollection is the fix if that becomes a problem.
function assertProgrammeId(programmeId: string): void {
  if (!PROGRAMME_ID_PATTERN.test(programmeId)) {
    throw new Error('Invalid programme id.');
  }
}

function getProgrammeToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isSessionRestorable(session: ProgrammeSession, today = getProgrammeToday()): boolean {
  return session.date >= today;
}

function dedupeCareers(careers: ProgrammeCareer[]): ProgrammeCareer[] {
  const seen = new Set<string>();
  return careers.filter(career => {
    if (seen.has(career.id)) return false;
    seen.add(career.id);
    return true;
  });
}

function sortableSessionTime(session: Pick<ProgrammeSession, 'date' | 'startTime'>): string {
  // startTime is a 12-hour "HH:MM AM/PM" display string, which does not sort
  // lexicographically in chronological order (e.g. "01:15 PM" < "12:35 PM" as
  // strings, but 12:35 PM comes first). Sort on the 24-hour equivalent instead.
  return `${session.date} ${programmeSessionDisplayTimeTo24Hour(session.startTime)}`;
}

// Returns the normalised programme plus whether any session's status or
// careers actually changed - callers that read this (getSchoolProgrammeSchedule)
// need to persist a change, since carry-forward has to be visible to the next
// write (e.g. marking a carried career "discussed") to actually work.
function normaliseSchoolProgramme(programme: SchoolProgramme): { programme: SchoolProgramme; changed: boolean } {
  const today = getProgrammeToday();
  const sessions = [...(programme.sessions || [])]
    .map(session => ({ ...session, careers: [...(session.careers || [])] }))
    .sort((a, b) => sortableSessionTime(a).localeCompare(sortableSessionTime(b)));

  let changed = false;

  sessions.forEach((session, index) => {
    if (session.status !== 'cancelled_restorable' || isSessionRestorable(session, today)) {
      return;
    }

    changed = true;

    const careersToCarry = session.careers
      .filter(career => career.status !== 'discussed')
      .map(career => ({
        ...career,
        status: 'planned' as ProgrammeCareerStatus,
        carriedForwardFrom: session.dateLabel,
      }));

    const nextSession = sessions
      .slice(index + 1)
      .find(candidate => candidate.status === 'scheduled' || candidate.status === 'completed');

    session.status = 'cancelled_passed';

    // Only clear this session's careers once we've confirmed somewhere to carry
    // them forward to. With no upcoming session (e.g. the programme is ending),
    // leaving them attached here is the only way they don't silently vanish.
    if (nextSession && careersToCarry.length > 0) {
      session.careers = session.careers.filter(career => career.status === 'discussed');
      // nextSession's own careers go first so an already-"discussed" entry
      // there wins the dedupe instead of being reset to "planned" by the
      // incoming carried copy.
      nextSession.careers = dedupeCareers([...nextSession.careers, ...careersToCarry]);
      nextSession.carryForwardFrom = `From cancelled session on ${session.dateLabel}`;
    }
  });

  return {
    programme: { ...programme, sessions },
    changed,
  };
}

function getCancelledStatusForDate(date: string): ProgrammeSessionStatus {
  return isSessionRestorable({ date } as ProgrammeSession) ? 'cancelled_restorable' : 'cancelled_passed';
}

export async function getSchoolProgrammeSchedule(programmeId = DEFAULT_SCHOOL_PROGRAMME_ID): Promise<SchoolProgrammeSchedule | null> {
  assertProgrammeId(programmeId);

  const programmeRef = adminDb.collection(SCHOOL_PROGRAMMES_COLLECTION).doc(programmeId);
  const programmeDoc = await programmeRef.get();
  if (!programmeDoc.exists) {
    return null;
  }

  const programme = {
    id: programmeDoc.id,
    ...programmeDoc.data(),
  } as SchoolProgramme;
  const { programme: normalisedProgramme, changed } = normaliseSchoolProgramme(programme);

  const [careerCoverage, institutionDoc] = await Promise.all([
    getActiveCareerCoverage(),
    adminDb.collection(INSTITUTIONS_COLLECTION).doc(normalisedProgramme.institutionId).get(),
    // Persist status/career transitions (e.g. cancelled_restorable -> cancelled_passed
    // carrying careers forward) so a later write - like marking a carried
    // career "discussed" - finds them already on the target session.
    changed
      ? programmeRef.set({ sessions: normalisedProgramme.sessions, updatedAt: safeFormat(new Date()) }, { merge: true })
      : Promise.resolve(),
  ]);
  normalisedProgramme.careerCoverage = careerCoverage;

  if (!institutionDoc.exists) {
    throw new Error(`Institution not found for programme ${normalisedProgramme.id}.`);
  }

  return {
    institution: {
      id: institutionDoc.id,
      ...institutionDoc.data(),
    } as Institution,
    programme: normalisedProgramme,
  };
}

/**
 * Mirrors a session onto the primary Google Calendar (same calendar used for
 * 1:1 lead appointments, so the counsellor plans off one place). Best-effort:
 * missing credentials (e.g. local dev) or a Calendar API error are logged and
 * swallowed rather than failing the caller - the calendar event is a mirror
 * of Firestore, never the source of truth for the session itself.
 */
async function syncProgrammeSessionCalendarEvent(
  programmeRef: FirebaseFirestore.DocumentReference,
  session: ProgrammeSession,
  institutionName: string
): Promise<void> {
  try {
    const cancelled = session.status === 'cancelled_restorable' || session.status === 'cancelled_passed';
    const eventBody = buildProgrammeSessionEventBody(
      { ...session, school: institutionName || session.school },
      cancelled
    );
    const event = await upsertProgrammeSessionEvent(eventBody, session.calendarEventId);

    if (event.id && event.id !== session.calendarEventId) {
      await adminDb.runTransaction(async transaction => {
        const snapshot = await transaction.get(programmeRef);
        if (!snapshot.exists) return;

        const programme = snapshot.data() as SchoolProgramme;
        const sessions = [...(programme.sessions || [])];
        const index = sessions.findIndex(candidate => candidate.id === session.id);
        if (index === -1) return;

        sessions[index] = { ...sessions[index], calendarEventId: event.id! };
        transaction.set(programmeRef, { sessions }, { merge: true });
      });
    }
  } catch (error: any) {
    console.error('School programme calendar sync failed:', error.message);
  }
}

export type SchoolProgrammeSessionUpdate =
  | { action: 'cancel'; reason?: string }
  | { action: 'restore' }
  | { action: 'setCareerStatus'; careerId: string; status: ProgrammeCareerStatus }
  | { action: 'setCareers'; careerIds: string[] }
  | { action: 'setNote'; note: string };

export async function updateSchoolProgrammeSession(
  programmeId: string,
  sessionId: string,
  update: SchoolProgrammeSessionUpdate
): Promise<SchoolProgrammeSchedule | null> {
  assertProgrammeId(programmeId);
  if (!PROGRAMME_ID_PATTERN.test(sessionId)) {
    throw new Error('Invalid session id.');
  }

  const programmeRef = adminDb.collection(SCHOOL_PROGRAMMES_COLLECTION).doc(programmeId);
  const activeCareerCoverage = update.action === 'setCareers' ? await getActiveCareerCoverage() : null;

  let updatedSession: ProgrammeSession | null = null;
  let institutionName = '';

  await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(programmeRef);
    if (!snapshot.exists) {
      throw new Error('School programme not found');
    }

    const programme = {
      id: snapshot.id,
      ...snapshot.data(),
    } as SchoolProgramme;

    const sessionIndex = (programme.sessions || []).findIndex(session => session.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error('Programme session not found');
    }

    const sessions = [...programme.sessions];
    const session = {
      ...sessions[sessionIndex],
      careers: [...(sessions[sessionIndex].careers || [])],
    };

    if (update.action === 'cancel') {
      const reason = (update.reason || '').trim();
      if (reason.length > 120) {
        throw new Error('Cancellation reason must be 120 characters or less.');
      }

      session.status = getCancelledStatusForDate(session.date);
      session.reason = reason;
    } else if (update.action === 'restore') {
      if (session.status !== 'cancelled_restorable') {
        throw new Error('Only restorable cancelled sessions can be restored.');
      }
      if (!isSessionRestorable(session)) {
        throw new Error('This session has passed and can no longer be restored.');
      }

      session.status = 'scheduled';
      session.reason = '';
    } else if (update.action === 'setCareerStatus') {
      if (!['planned', 'discussed'].includes(update.status)) {
        throw new Error('Invalid career status.');
      }

      const careerIndex = session.careers.findIndex(career => career.id === update.careerId);
      if (careerIndex === -1) {
        throw new Error('Career not found on this session.');
      }

      session.careers[careerIndex] = {
        ...session.careers[careerIndex],
        status: update.status,
      };
    } else if (update.action === 'setNote') {
      const note = (update.note || '').trim();
      if (note.length > 500) {
        throw new Error('Note must be 500 characters or less.');
      }

      session.note = note;
    } else if (update.action === 'setCareers') {
      const careerIds = Array.from(new Set(update.careerIds));
      if (careerIds.length > 8 || careerIds.some(id => !PROGRAMME_ID_PATTERN.test(id))) {
        throw new Error('Invalid career selection.');
      }

      const existingById = new Map(session.careers.map(career => [career.id, career]));
      const coverageById = new Map((activeCareerCoverage || []).map(career => [career.id, career]));

      session.careers = careerIds.map(id => {
        const existing = existingById.get(id);
        const coverage = coverageById.get(id);
        if (!existing && !coverage) {
          throw new Error('Career not found in this programme.');
        }
        return {
          ...(coverage || existing!),
          ...(existing ? { status: existing.status } : { status: 'planned' as ProgrammeCareerStatus }),
        };
      });
    }

    sessions[sessionIndex] = session;
    updatedSession = session;
    institutionName = programme.institutionName;
    transaction.set(
      programmeRef,
      {
        sessions,
        updatedAt: safeFormat(new Date()),
      },
      { merge: true }
    );
  });

  // A note change touches no field the calendar event body is built from
  // (see buildProgrammeSessionEventBody) - skip the API round-trip for it.
  if (updatedSession && update.action !== 'setNote') {
    await syncProgrammeSessionCalendarEvent(programmeRef, updatedSession, institutionName);
  }

  return getSchoolProgrammeSchedule(programmeId);
}

// Placeholder starter set so the Careers master isn't empty on first use.
// School programmes read session-assignable careers live from this
// collection via getActiveCareerCoverage() - see updateSchoolProgrammeSession
// and getSchoolProgrammeSchedule above.
const DEFAULT_CAREERS: Array<Pick<Career, 'id' | 'name' | 'area' | 'color' | 'description'>> = [
  { id: 'cybersecurity-analyst', name: 'Cybersecurity Analyst', area: 'Technology', color: 'indigo', description: 'Works to protect systems, networks and data from cyber threats.' },
  { id: 'sports-management', name: 'Sports Management', area: 'Sports + Business', color: 'green', description: 'Involves the business and operations side of sports and events.' },
  { id: 'genetic-counsellor', name: 'Genetic Counsellor', area: 'Healthcare', color: 'green', description: 'Helps individuals and families understand genetic conditions.' },
  { id: 'architect', name: 'Architect', area: 'Design', color: 'amber', description: 'Designs buildings and spaces that are functional, safe and aesthetically pleasing.' },
  { id: 'environmental-scientist', name: 'Environmental Scientist', area: 'Science', color: 'sky', description: 'Studies environmental systems and solves ecological problems.' },
  { id: 'actuary', name: 'Actuary', area: 'Finance + Math', color: 'green', description: 'Uses statistics to understand financial risk and uncertainty.' },
  { id: 'product-designer', name: 'Product Designer', area: 'Design', color: 'amber', description: 'Designs digital or physical products around user needs.' },
  { id: 'digital-marketing', name: 'Digital Marketing', area: 'Business', color: 'indigo', description: 'Plans online campaigns across search, social, content and analytics.' },
  { id: 'nutritionist', name: 'Nutritionist', area: 'Healthcare', color: 'green', description: 'Guides people on food choices, health goals and diet planning.' },
  { id: 'civil-services', name: 'Civil Services', area: 'Public Service', color: 'amber', description: 'Works in government administration, policy and public service delivery.' },
];

async function ensureDefaultCareers(): Promise<void> {
  const snapshot = await adminDb.collection(CAREERS_COLLECTION).limit(1).get();
  if (!snapshot.empty) return;

  const now = safeFormat(new Date());
  const batch = adminDb.batch();
  for (const career of DEFAULT_CAREERS) {
    const docRef = adminDb.collection(CAREERS_COLLECTION).doc(career.id);
    batch.set(docRef, { ...career, status: 'active', createdAt: now, updatedAt: now }, { merge: true });
  }
  await batch.commit();
}

export async function getCareers(): Promise<Career[]> {
  await ensureDefaultCareers();
  const snapshot = await adminDb.collection(CAREERS_COLLECTION).orderBy('name').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Career));
}

// School programmes select session careers from the live, active subset of
// the Careers master rather than a frozen per-programme copy. `status` here
// is a placeholder - coverage entries aren't tied to any session, only a
// session's own `careers` array tracks planned/discussed.
export async function getActiveCareerCoverage(): Promise<ProgrammeCareer[]> {
  const careers = await getCareers();
  return careers
    .filter(career => career.status === 'active')
    .map(career => ({
      id: career.id,
      name: career.name,
      area: career.area,
      color: career.color,
      description: career.description,
      status: 'planned' as ProgrammeCareerStatus,
    }));
}

function slugifyCareerName(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || `career-${Date.now()}`;
}

function assertCareerFields(input: { name?: string; area?: string; color?: string; description?: string }): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error('Career name is required.');
  }
  if (input.area !== undefined && !input.area.trim()) {
    throw new Error('Career area is required.');
  }
  if (input.color !== undefined && !CAREER_COLORS.includes(input.color as Career['color'])) {
    throw new Error('Invalid career color.');
  }
  if (input.description !== undefined && input.description.length > 300) {
    throw new Error('Career description must be 300 characters or less.');
  }
}

export async function createCareer(input: {
  name: string;
  area: string;
  color: Career['color'];
  description: string;
}): Promise<Career> {
  assertCareerFields(input);

  const name = input.name.trim();
  const id = slugifyCareerName(name);
  const docRef = adminDb.collection(CAREERS_COLLECTION).doc(id);
  const existing = await docRef.get();
  if (existing.exists) {
    throw new Error('A career with this name already exists.');
  }

  const now = safeFormat(new Date());
  const career: Career = {
    id,
    name,
    area: input.area.trim(),
    color: input.color,
    description: input.description.trim(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(career);
  return career;
}

export async function updateCareer(
  careerId: string,
  updates: Partial<Pick<Career, 'name' | 'area' | 'color' | 'description' | 'status'>>
): Promise<Career> {
  assertCareerFields(updates);
  if (updates.status !== undefined && !['active', 'archived'].includes(updates.status)) {
    throw new Error('Invalid career status.');
  }

  const docRef = adminDb.collection(CAREERS_COLLECTION).doc(careerId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Career not found.');
  }

  const patch: Record<string, unknown> = { updatedAt: safeFormat(new Date()) };
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.area !== undefined) patch.area = updates.area.trim();
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.description !== undefined) patch.description = updates.description.trim();
  if (updates.status !== undefined) patch.status = updates.status;

  await docRef.set(patch, { merge: true });
  return { ...(doc.data() as Career), ...patch, id: careerId } as Career;
}

// Institution master (shared identity + known contacts). Previously only
// ever read nested inside a School Programme (getSchoolProgrammeSchedule
// above); this is real CRUD so Partnerships (and any future School
// Programme) can list from / add to a shared directory instead of each
// duplicating institution identity and contacts.
function assertInstitutionFields(input: { name?: string; campus?: string; address?: string }): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error('Institution name is required.');
  }
}

export async function getInstitutions(): Promise<Institution[]> {
  const snapshot = await adminDb.collection(INSTITUTIONS_COLLECTION).orderBy('name').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institution));
}

export async function getInstitutionById(institutionId: string): Promise<Institution | null> {
  const doc = await adminDb.collection(INSTITUTIONS_COLLECTION).doc(institutionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Institution;
}

export async function addInstitution(input: {
  name: string;
  campus?: string;
  address?: string;
  status?: Institution['status'];
  contacts?: InstitutionContact[];
}): Promise<Institution> {
  assertInstitutionFields(input);

  const now = safeFormat(new Date());
  const docRef = adminDb.collection(INSTITUTIONS_COLLECTION).doc();
  const institution: Institution = {
    id: docRef.id,
    name: input.name.trim(),
    campus: input.campus?.trim() || '',
    address: input.address?.trim() || '',
    status: input.status || 'active',
    contacts: input.contacts || [],
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(institution);
  return institution;
}

export async function updateInstitution(
  institutionId: string,
  updates: Partial<Pick<Institution, 'name' | 'campus' | 'address' | 'status' | 'contacts'>>
): Promise<Institution> {
  assertInstitutionFields(updates);

  const docRef = adminDb.collection(INSTITUTIONS_COLLECTION).doc(institutionId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Institution not found.');
  }

  const patch: Record<string, unknown> = { updatedAt: safeFormat(new Date()) };
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.campus !== undefined) patch.campus = updates.campus.trim();
  if (updates.address !== undefined) patch.address = updates.address.trim();
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.contacts !== undefined) patch.contacts = updates.contacts;

  await docRef.set(patch, { merge: true });
  return { ...(doc.data() as Institution), ...patch, id: institutionId } as Institution;
}

// Partnerships: the commercial/admissions relationship with an Institution.
// Company-wide (not per-counselor, matches how Leads/Users already work) -
// no ownerUid filtering, every staff/admin sees the same list. Delete is
// admin-only, matching deleteLead.
function assertPartnershipStatus(status?: string): void {
  if (status !== undefined && !['Prospecting', 'Active', 'Inactive'].includes(status)) {
    throw new Error('Invalid partnership status.');
  }
}

export async function getPartnerships(): Promise<Partnership[]> {
  const snapshot = await adminDb.collection(PARTNERSHIPS_COLLECTION).orderBy('institutionName').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partnership));
}

export async function getPartnershipById(partnershipId: string): Promise<Partnership | null> {
  const doc = await adminDb.collection(PARTNERSHIPS_COLLECTION).doc(partnershipId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Partnership;
}

export async function addPartnership(callerUid: string, input: {
  institutionId: string;
  institutionName: string;
  status?: PartnershipStatus;
  pointOfContact?: InstitutionContact;
  mouSigned?: boolean;
  commissionTerms?: string;
  notes?: string;
  tags?: string[];
}): Promise<Partnership> {
  if (!input.institutionId) {
    throw new Error('An institution is required.');
  }
  assertPartnershipStatus(input.status);

  const now = safeFormat(new Date());
  const docRef = adminDb.collection(PARTNERSHIPS_COLLECTION).doc();
  const partnership: Partnership = {
    id: docRef.id,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    status: input.status || 'Prospecting',
    pointOfContact: input.pointOfContact?.name?.trim() ? input.pointOfContact : { name: '', role: '' },
    mouSigned: input.mouSigned || false,
    commissionTerms: input.commissionTerms?.trim() || '',
    notes: input.notes?.trim() || '',
    tags: input.tags || [],
    createdAt: now,
    updatedAt: now,
    createdBy: callerUid,
  };

  await docRef.set(partnership);
  return partnership;
}

export async function updatePartnership(
  partnershipId: string,
  updates: Partial<Pick<Partnership, 'status' | 'pointOfContact' | 'mouSigned' | 'commissionTerms' | 'notes' | 'tags'>>
): Promise<Partnership> {
  assertPartnershipStatus(updates.status);

  const docRef = adminDb.collection(PARTNERSHIPS_COLLECTION).doc(partnershipId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Partnership not found.');
  }

  const patch: Record<string, unknown> = { updatedAt: safeFormat(new Date()) };
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.pointOfContact !== undefined) patch.pointOfContact = updates.pointOfContact;
  if (updates.mouSigned !== undefined) patch.mouSigned = updates.mouSigned;
  if (updates.commissionTerms !== undefined) patch.commissionTerms = updates.commissionTerms.trim();
  if (updates.notes !== undefined) patch.notes = updates.notes.trim();
  if (updates.tags !== undefined) patch.tags = updates.tags;

  await docRef.set(patch, { merge: true });
  return { ...(doc.data() as Partnership), ...patch, id: partnershipId } as Partnership;
}

export async function deletePartnership(callerUid: string, role: UserRole, partnershipId: string): Promise<void> {
  if (role !== UserRole.Admin) {
    throw new Error('Unauthorized: Only admins can delete partnerships.');
  }
  await adminDb.collection(PARTNERSHIPS_COLLECTION).doc(partnershipId).delete();
}

// Referrals: one lead referred to one partner institution, tracked through
// to commission outcome. Kept as its own top-level collection (rather than
// embedded on Partnership) so it can be queried by due-date across every
// partnership (Today's "Partner Follow-ups") and by lead (Lead drawer).
const REFERRAL_STATUSES: ReferralStatus[] = [
  'Referred', 'Intimated', 'Acknowledged', 'Admitted', 'Commission Due', 'Commission Paid', 'Declined',
];
const OPEN_REFERRAL_STATUSES: ReferralStatus[] = REFERRAL_STATUSES.filter(
  status => status !== 'Commission Paid' && status !== 'Declined'
);

export async function getReferrals(options?: {
  leadId?: string;
  partnershipId?: string;
  dueForFollowUp?: boolean;
}): Promise<Referral[]> {
  let ref: FirebaseFirestore.Query = adminDb.collection(REFERRALS_COLLECTION);

  if (options?.leadId) {
    ref = ref.where('leadId', '==', options.leadId);
  }
  if (options?.partnershipId) {
    ref = ref.where('partnershipId', '==', options.partnershipId);
  }

  const snapshot = await ref.get();
  let referrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));

  if (options?.dueForFollowUp) {
    const today = safeFormat(new Date());
    referrals = referrals.filter(referral =>
      !!referral.nextFollowUpDate &&
      referral.nextFollowUpDate <= today &&
      OPEN_REFERRAL_STATUSES.includes(referral.status)
    );
  }

  return referrals.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function addReferral(callerUid: string, input: {
  leadId: string;
  leadName: string;
  partnershipId: string;
  institutionId: string;
  institutionName: string;
}): Promise<Referral> {
  if (!input.leadId || !input.partnershipId) {
    throw new Error('A lead and a partnership are required.');
  }

  const now = safeFormat(new Date());
  const docRef = adminDb.collection(REFERRALS_COLLECTION).doc();
  const referral: Referral = {
    id: docRef.id,
    leadId: input.leadId,
    leadName: input.leadName,
    partnershipId: input.partnershipId,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    status: 'Referred',
    referredAt: now,
    referredBy: callerUid,
    timeline: [{ date: now, note: `Referred to ${input.institutionName}`, byUid: callerUid }],
    updatedAt: now,
  };

  await docRef.set(referral);
  return referral;
}

export async function updateReferral(
  callerUid: string,
  referralId: string,
  updates: Partial<Pick<Referral,
    'status' | 'intimatedAt' | 'intimatedBy' | 'nextFollowUpDate' | 'lastFollowUpNote' |
    'commissionAmount' | 'commissionStatus'
  >>,
  timelineNote?: string
): Promise<Referral> {
  if (updates.status !== undefined && !REFERRAL_STATUSES.includes(updates.status)) {
    throw new Error('Invalid referral status.');
  }

  const docRef = adminDb.collection(REFERRALS_COLLECTION).doc(referralId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Referral not found.');
  }

  const now = safeFormat(new Date());
  const existing = doc.data() as Referral;
  const patch: Record<string, unknown> = { ...updates, updatedAt: now };

  const note = timelineNote || (updates.status !== undefined ? `Status changed to ${updates.status}` : undefined);
  if (note) {
    patch.timeline = [...(existing.timeline || []), { date: now, note, byUid: callerUid } as ReferralTimelineEntry];
  }

  await docRef.set(patch, { merge: true });
  return { ...existing, ...patch, id: referralId } as Referral;
}
