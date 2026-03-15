export type LeadStage = 
  | 'New' 
  | 'Converted' 
  | 'Details Requested' 
  | 'Test Sent' 
  | 'Test Completed' 
  | 'Appt Scheduled' 
  | '1:1 Complete' 
  | 'Report Sent' 
  | 'Lost';

export interface Lead {
  // Basic & System
  id: number;
  name: string;
  phone: string;
  email: string;
  stage: LeadStage;
  inquiryDate: string;
  updatedAt: string;
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
  testLink: string;
  appointmentTime: string;
  feesPaid: boolean;
  feesAmount?: string;
  paymentMode?: string;
  transactionId?: string;
  reportSentDate: string;
  convertedDate: string;
  reportPdfUrl?: string;
  communityJoined: boolean;
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
