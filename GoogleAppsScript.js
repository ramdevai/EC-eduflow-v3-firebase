/**
 * EduCompass Registration Form Sync Script
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Form (Registration Form).
 * 2. Click the "Responses" tab.
 * 3. Click "Link to Sheets" to create/open the results spreadsheet.
 * 4. In that Spreadsheet, go to Extensions > Apps Script.
 * 5. Delete any existing code and paste this entire script.
 * 6. Replace 'MASTER_SHEET_ID_HERE' with your Master CRM Sheet ID.
 * 7. Click the Disk icon (Save).
 * 8. Click the Clock icon (Triggers) on the left sidebar.
 * 9. Click "+ Add Trigger".
 * 10. Choose: Run function 'onFormSubmit' | Event source 'From spreadsheet' | Event type 'On form submit'.
 */

const MASTER_SHEET_ID = 'MASTER_SHEET_ID_HERE'; // <--- REPLACE THIS

function onFormSubmit(e) {
  const responses = e.values; // Array of form answers
  // Map based on your form order:
  // [Timestamp, Name, Address, Gender, Email, Phone, DOB, Class, Board, School, Hobbies, Father Name, Father Phone, Father Email, Father Occupation, Mother Name, Mother Phone, Mother Email, Mother Occupation, Source, Comments]
  
  const formData = {
    name: responses[1],
    address: responses[2],
    gender: responses[3],
    email: responses[4],
    phone: responses[5],
    dob: responses[6],
    grade: responses[7],
    board: responses[8],
    school: responses[9],
    hobbies: responses[10],
    fatherName: responses[11],
    fatherPhone: responses[12],
    fatherEmail: responses[13],
    fatherOccupation: responses[14],
    motherName: responses[15],
    motherPhone: responses[16],
    motherEmail: responses[17],
    motherOccupation: responses[18],
    source: responses[19],
    comments: responses[20]
  };

  const masterSs = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sheet = masterSs.getSheetByName('Leads');
  const data = sheet.getDataRange().getValues();
  
  const phoneToMatch = formData.phone.toString().replace(/\D/g, '');
  let foundRow = -1;

  // Search for existing lead by phone number (Column C / Index 2)
  for (let i = 1; i < data.length; i++) {
    const sheetPhone = data[i][2].toString().replace(/\D/g, '');
    if (sheetPhone && sheetPhone.includes(phoneToMatch)) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow !== -1) {
    // Update existing row (Columns I to Y)
    // Map to your Master Sheet columns:
    // I=9, J=10, K=11, L=12, M=13, N=14, O=15, P=16, Q=17, R=18, S=19, T=20, U=21, V=22, W=23, X=24, Y=25
    sheet.getRange(foundRow, 9, 1, 17).setValues([[
      formData.address,
      formData.gender,
      formData.dob,
      formData.grade,
      formData.board,
      formData.school,
      formData.hobbies,
      formData.fatherName,
      formData.fatherPhone,
      formData.fatherEmail,
      formData.fatherOccupation,
      formData.motherName,
      formData.motherPhone,
      formData.motherEmail,
      formData.motherOccupation,
      formData.source,
      formData.comments
    ]]);
    
    // Update stage to 'Test Sent' or similar if needed
    sheet.getRange(foundRow, 5).setValue('Details Requested');
    sheet.getRange(foundRow, 7).setValue(new Date().toISOString()); // Updated At
  } else {
    // Lead not found, create a new one at the bottom
    const newId = data.length > 1 ? Math.max(...data.slice(1).map(r => r[0])) + 1 : 1;
    const newRow = [
      newId,
      formData.name,
      formData.phone,
      formData.email,
      'Details Requested', // Stage
      new Date().toISOString(), // Inquiry Date
      new Date().toISOString(), // Updated At
      '', // Google Contact ID
      formData.address,
      formData.gender,
      formData.dob,
      formData.grade,
      formData.board,
      formData.school,
      formData.hobbies,
      formData.fatherName,
      formData.fatherPhone,
      formData.fatherEmail,
      formData.fatherOccupation,
      formData.motherName,
      formData.motherPhone,
      formData.motherEmail,
      formData.motherOccupation,
      formData.source,
      formData.comments,
      '', // Notes
      '', // Last Follow Up
      '', // Test Link
      '', // Appt Time
      'FALSE', // Fees Paid
      '', // Fees Amount
      '', // Payment Mode
      '', // Transaction ID
      '', // Report Sent Date
      '', // Converted Date
      '', // Report PDF URL
      'FALSE' // Community Joined
    ];
    sheet.appendRow(newRow);
  }
}
