
import { Lead, LeadStage, LeadStatus, FeesPaidStatus, CommunityJoinedStatus, UserRole } from './types';
import { generateRegistrationToken, safeFormat } from './utils';

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
    calendarEventId: lead.calendarEventId || '',
    communicateViaEmailOnly: lead.communicateViaEmailOnly || false,
  };
  return doc;
};

// Lead Functions
export async function getAllLeads(callerUid: string, role: UserRole): Promise<Lead[]> {
  const { adminDb } = await import('./server-firebase');
  let leadsRef: FirebaseFirestore.Query = adminDb.collection(LEADS_COLLECTION);

  // Staff can see all leads (but cannot delete)
  // Only true Admins get special treatment for other operations
  if (role !== UserRole.Admin && role !== UserRole.Staff) {
    leadsRef = leadsRef.where('ownerUid', '==', callerUid);
  }

  const snapshot = await leadsRef.get();
  return snapshot.docs.map(doc => mapDocToLead({ ...doc.data(), id: doc.id }));
}

export async function addLeads(callerUid: string, role: UserRole, leads: Partial<Lead>[]): Promise<string[]> {
  if (leads.length === 0) return [];
  const { adminDb } = await import('./server-firebase');
  const batch = adminDb.batch();
  const newLeadIds: string[] = [];

  leads.forEach(lead => {
    const docRef = adminDb.collection(LEADS_COLLECTION).doc();
    const leadData = mapLeadToDoc({ ...lead, ownerUid: callerUid, updatedAt: safeFormat(new Date()) });
    batch.set(docRef, leadData);
    newLeadIds.push(docRef.id);
  });

  await batch.commit();
  return newLeadIds;
}

export async function updateLeads(callerUid: string, role: UserRole, updates: { id: string; data: Partial<Lead> }[]): Promise<void> {
  if (updates.length === 0) return;
  const { adminDb } = await import('./server-firebase');
  const batch = adminDb.batch();

  for (const update of updates) {
    const docRef = adminDb.collection(LEADS_COLLECTION).doc(update.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Lead with ID ${update.id} not found`);
    }

    const existingLead = mapDocToLead(doc.data()!);

    if (role !== UserRole.Admin && role !== UserRole.Staff) {
      throw new Error('Unauthorized: You do not have permission to update this lead.');
    }

    const updatedData = { ...update.data, updatedAt: safeFormat(new Date()) };
    batch.update(docRef, updatedData);
  }

  await batch.commit();
}

export async function deleteLead(callerUid: string, role: UserRole, leadId: string): Promise<void> {
  if (role !== UserRole.Admin) {
    throw new Error('Unauthorized: Only admins can delete leads.');
  }
  const { adminDb } = await import('./server-firebase');
  const docRef = adminDb.collection(LEADS_COLLECTION).doc(leadId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return; // Lead not found, nothing to delete
  }

  await docRef.delete();
}

export async function getLeadByToken(registrationToken: string): Promise<Lead | null> {
  const { adminDb } = await import('./server-firebase');
  const snapshot = await adminDb.collection(LEADS_COLLECTION).where('registrationToken', '==', registrationToken).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  return mapDocToLead({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
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
  const { adminDb } = await import('./server-firebase');
  const batch = adminDb.batch();
  for (const template of DEFAULT_TEMPLATES) {
    const docRef = adminDb.collection(TEMPLATES_COLLECTION).doc(template.id);
    // Only set if it doesn't exist, or merge if it does
    batch.set(docRef, template, { merge: true });
  }
  await batch.commit();
}

export async function getTemplates(): Promise<TemplateDocument[]> {
  const { adminDb } = await import('./server-firebase');
  await ensureDefaultTemplates(); // Ensure defaults are present
  const snapshot = await adminDb.collection(TEMPLATES_COLLECTION).get();
  return snapshot.docs.map(doc => doc.data() as TemplateDocument);
}

export async function updateTemplate(callerUid: string, role: UserRole, templateId: string, updates: { subject?: string; message?: string }): Promise<void> {
  if (role !== UserRole.Admin) {
    throw new Error('Unauthorized: Only admins can update templates.');
  }
  const { adminDb } = await import('./server-firebase');
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
    const { adminDb } = await import('./server-firebase');
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
  const { adminDb } = await import('./server-firebase');
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
  const { adminDb } = await import('./server-firebase');
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
  const { adminDb } = await import('./server-firebase');
  await adminDb.collection(USERS_COLLECTION).doc(userId).delete();
}
