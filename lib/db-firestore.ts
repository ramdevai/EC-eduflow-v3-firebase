import 'server-only';

import { Lead, LeadStage, LeadStatus, FeesPaidStatus, CommunityJoinedStatus, UserRole, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from './types';
import { generateRegistrationSid, generateRegistrationToken, safeFormat } from './utils';
import { adminDb } from './server-firebase';

const LEADS_COLLECTION = 'leads';
const TEMPLATES_COLLECTION = 'templates';
const USERS_COLLECTION = 'users';

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
  };
};

// Helper to convert Lead type to Firestore DocumentData
const mapLeadToDoc = (lead: Partial<Lead>): LeadDocument => {
  const doc: LeadDocument = {
    ownerUid: lead.ownerUid || '',
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
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
  stages: Record<string, number>;
}> {
  let baseQuery: FirebaseFirestore.Query = adminDb.collection(LEADS_COLLECTION);

  if (role !== UserRole.Admin && role !== UserRole.Staff) {
    baseQuery = baseQuery.where('ownerUid', '==', callerUid);
  }

  const STAGES: LeadStage[] = [
    'New', 'Registration requested', 'Registration done', 'Test sent', 'Test completed', 
    '1:1 scheduled', 'Session complete', 'Report sent', 'Lost'
  ];

  // Fetch counts for all stages in parallel
  const snapshots = await Promise.all(
    STAGES.map(stage => baseQuery.where('stage', '==', stage).count().get())
  );

  const stageCounts: Record<string, number> = {};
  STAGES.forEach((stage, i) => {
    stageCounts[stage] = snapshots[i].data().count;
  });

  const pipeline = STAGES
    .filter(s => s !== 'Lost' && s !== 'Report sent')
    .reduce((sum, s) => sum + stageCounts[s], 0);

  return {
    pipeline,
    customers: stageCounts['Report sent'] || 0,
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
    leadsRef = leadsRef.where('stage', '==', 'Lost');
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
  const leads = snapshot.docs.map(doc => {
    const data = doc.data();
    if (options?.summary) {
      // Return only essential fields for list view
      return {
        id: doc.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        stage: data.stage || 'New',
        status: data.status || 'Open',
        updatedAt: data.updatedAt || '',
        grade: data.grade || '',
        board: data.board || '',
        inquiryDate: data.inquiryDate || '',
      } as Lead;
    }
    return mapDocToLead({ ...data, id: doc.id });
  });

  // Performance optimization: Sort in JS for categories that would otherwise require complex indexes
  if (options?.category === 'pipeline' || options?.category === 'customers') {
    const sorted = leads.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    
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
  { id: 'birthday', label: 'Birthday Wish', subject: 'Happy Birthday {name}! 🎂', message: 'Hi {name}, wishing you a very Happy Birthday! 🎂 Hope you have a fantastic day ahead! - Binal from EduCompass' },
  { id: 'report_email', label: 'Report Email', subject: '{name} - Career Counseling Report', message: "Dear Parent,\n\nPlease find attached the career counseling report for {name}.\n\nBased on our 1:1 session, we discussed the following career choices and recommendations:\n{notes}\n\n[PLEASE ATTACH THE PDF DOWNLOADED FROM EDUMILESTONES]\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nBinal\nFounder, EduCompass" },
  { id: 'fees_reminder', label: 'Fees Reminder', subject: 'Professional Fees Reminder - EduCompass', message: 'Hi {name}, just a gentle reminder regarding the professional fees for the career counseling session. Please ignore if already paid. Thanks!' },
];

export async function ensureDefaultTemplates() {
  
  // Idempotency check: only run if collection is empty or missing
  const snapshot = await adminDb.collection(TEMPLATES_COLLECTION).limit(1).get();
  if (!snapshot.empty) return;

  const batch = adminDb.batch();
  for (const template of DEFAULT_TEMPLATES) {
    const docRef = adminDb.collection(TEMPLATES_COLLECTION).doc(template.id);
    batch.set(docRef, template, { merge: true });
  }
  await batch.commit();
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
