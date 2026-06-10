import { LeadStage, LeadStatus } from './types';

export const SAMPLE_LEADS = [
  { name: "Test Student 01", phone: "+1 202-555-0101", email: "student.01@example.com", grade: "10th", board: "CBSE", stage: "New" as LeadStage, status: "Open" as LeadStatus },
  { name: "Test Student 02", phone: "+1 202-555-0102", email: "student.02@example.com", grade: "12th", board: "ISC", stage: "Registration requested" as LeadStage, status: "Open" as LeadStatus },
  { name: "Test Student 03", phone: "+1 202-555-0103", email: "student.03@example.com", grade: "9th", board: "IB", stage: "Registration done" as LeadStage, status: "Open" as LeadStatus },
  { name: "Test Student 04", phone: "+1 202-555-0104", email: "student.04@example.com", grade: "11th", board: "IGCSE", stage: "Test sent" as LeadStage, status: "Open" as LeadStatus },
  { name: "Test Student 05", phone: "+1 202-555-0105", email: "student.05@example.com", grade: "Graduate", board: "Example University", stage: "Test completed" as LeadStage, status: "Open" as LeadStatus },
  { name: "Test Student 06", phone: "+1 202-555-0106", email: "student.06@example.com", grade: "7th", board: "State Board", stage: "1:1 scheduled" as LeadStage, status: "Open" as LeadStatus },
  { name: "Test Student 07", phone: "+1 202-555-0107", email: "student.07@example.com", grade: "10th", board: "CBSE", stage: "Session complete" as LeadStage, status: "Won" as LeadStatus },
  { name: "Test Student 08", phone: "+1 202-555-0108", email: "student.08@example.com", grade: "12th", board: "ISC", stage: "Report sent" as LeadStage, status: "Won" as LeadStatus },
  { name: "Test Student 09", phone: "+1 202-555-0109", email: "student.09@example.com", grade: "12th", board: "ISC", stage: "Lost" as LeadStage, status: "Lost" as LeadStatus },
];
