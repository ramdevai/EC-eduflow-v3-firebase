import { NextResponse } from 'next/server';
import { addLead } from '@/lib/db-sheets';
import { auth } from '@/lib/auth';
import { LeadStage, LeadStatus } from '@/lib/types';

const SAMPLE_LEADS = [
  { name: "Arjun Sharma", phone: "9876543210", email: "arjun.s@gmail.com", grade: "10th", board: "CBSE", stage: "New" as LeadStage, status: "Open" as LeadStatus },
  { name: "Priya Patel", phone: "9123456789", email: "priyap@yahoo.com", grade: "12th", board: "ISC", stage: "Registration requested" as LeadStage, status: "Open" as LeadStatus },
  { name: "Siddharth Nair", phone: "8877665544", email: "sid.nair@outlook.com", grade: "9th", board: "IB", stage: "Registration done" as LeadStage, status: "Open" as LeadStatus },
  { name: "Ananya Iyer", phone: "7766554433", email: "ananya.i@icloud.com", grade: "11th", board: "IGCSE", stage: "Test sent" as LeadStage, status: "Open" as LeadStatus },
  { name: "Rohan Gupta", phone: "9988776655", email: "rohan.g@hotmail.com", grade: "Graduate", board: "Delhi University", stage: "Test completed" as LeadStage, status: "Open" as LeadStatus },
  { name: "Meera Reddy", phone: "9900887766", email: "meera.r@gmail.com", grade: "7th", board: "State Board", stage: "1:1 scheduled" as LeadStage, status: "Open" as LeadStatus },
  { name: "Vikram Malhotra", phone: "8899001122", email: "v.malhotra@gmail.com", grade: "10th", board: "CBSE", stage: "Session complete" as LeadStage, status: "Won" as LeadStatus },
  { name: "Kavita Singh", phone: "7788990011", email: "kavita.s@gmail.com", grade: "12th", board: "ISC", stage: "Report sent" as LeadStage, status: "Won" as LeadStatus },
  { name: "Aditya Verma", phone: "9112233445", email: "aditya.v@gmail.com", grade: "11th", board: "CBSE", stage: "New" as LeadStage, status: "Open" as LeadStatus },
  { name: "Zoya Khan", phone: "8223344556", email: "zoya.k@gmail.com", grade: "9th", board: "ICSE", stage: "New" as LeadStage, status: "Open" as LeadStatus },
  { name: "Kabir Das", phone: "7334455667", email: "kabir.d@gmail.com", grade: "10th", board: "CBSE", stage: "Registration requested" as LeadStage, status: "Open" as LeadStatus },
  { name: "Ishani Bose", phone: "9445566778", email: "ishani.b@gmail.com", grade: "8th", board: "ICSE", stage: "Registration done" as LeadStage, status: "Open" as LeadStatus },
  { name: "Rishi Kapoor", phone: "8556677889", email: "rishi.k@gmail.com", grade: "12th", board: "IB", stage: "Test sent" as LeadStage, status: "Open" as LeadStatus },
  { name: "Tanya Misra", phone: "7667788990", email: "tanya.m@gmail.com", grade: "Graduate", board: "Mumbai University", stage: "Test completed" as LeadStage, status: "Open" as LeadStatus },
  { name: "Sameer Joshi", phone: "9778899001", email: "sameer.j@gmail.com", grade: "11th", board: "State Board", stage: "1:1 scheduled" as LeadStage, status: "Open" as LeadStatus },
  { name: "Neha Roy", phone: "8889900112", email: "neha.r@gmail.com", grade: "10th", board: "CBSE", stage: "Session complete" as LeadStage, status: "Won" as LeadStatus },
  { name: "Yash Chopra", phone: "7990011223", email: "yash.c@gmail.com", grade: "9th", board: "ICSE", stage: "Report sent" as LeadStage, status: "Won" as LeadStatus },
  { name: "Dia Mirza", phone: "9101112131", email: "dia.m@gmail.com", grade: "12th", board: "ISC", stage: "New" as LeadStage, status: "Lost" as LeadStatus },
  { name: "Aman Gupta", phone: "8212324252", email: "aman.g@gmail.com", grade: "10th", board: "CBSE", stage: "New" as LeadStage, status: "Open" as LeadStatus },
  { name: "Sana Sheikh", phone: "7323435363", email: "sana.s@gmail.com", grade: "11th", board: "CBSE", stage: "Registration requested" as LeadStage, status: "Open" as LeadStatus },
  { name: "Vivaan Saxena", phone: "9434546474", email: "vivaan.s@gmail.com", grade: "8th", board: "ICSE", stage: "Test sent" as LeadStage, status: "Open" as LeadStatus },
  { name: "Kiara Advani", phone: "8545657585", email: "kiara.a@gmail.com", grade: "12th", board: "IB", stage: "Test completed" as LeadStage, status: "Open" as LeadStatus },
  { name: "Armaan Malik", phone: "7656768696", email: "armaan.m@gmail.com", grade: "9th", board: "State Board", stage: "1:1 scheduled" as LeadStage, status: "Open" as LeadStatus },
  { name: "Tara Sutaria", phone: "9767879808", email: "tara.s@gmail.com", grade: "10th", board: "CBSE", stage: "Session complete" as LeadStage, status: "Won" as LeadStatus },
  { name: "Ishan Khatter", phone: "8878980919", email: "ishan.k@gmail.com", grade: "11th", board: "ISC", stage: "Report sent" as LeadStage, status: "Won" as LeadStatus },
];

export async function POST(req: Request) {
  const session = await auth() as any;
  const sheetId = req.headers.get('x-sheet-id');

  if (!session?.accessToken || !sheetId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    for (const lead of SAMPLE_LEADS) {
      await addLead(sheetId, session.accessToken, lead);
    }
    return NextResponse.json({ success: true, count: SAMPLE_LEADS.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
