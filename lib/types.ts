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
  id: number;
  name: string;
  phone: string;
  email: string;
  grade: string;
  board: string;
  stage: LeadStage;
  inquiryDate: string;
  notes: string;
  lastFollowUp: string;
  testLink: string;
  appointmentTime: string;
  feesPaid: boolean;
  reportSentDate: string;
  convertedDate: string;
  updatedAt: string;
  googleContactId?: string;
}

export const TEST_LINKS = {
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
