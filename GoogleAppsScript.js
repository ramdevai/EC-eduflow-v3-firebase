/**
 * EduCompass Registration Form Sync Script - VERSION 2 (Lead ID Based)
 * 
 * INSTRUCTIONS:
 * 1. Delete ALL existing code in this editor.
 * 2. Paste this entire script.
 * 3. Replace 'MASTER_SHEET_ID_HERE' with your actual CRM Sheet ID (found in URL).
 * 4. IMPORTANT: Click the DISK ICON (Save) and wait for it to finish.
 * 5. Go to Triggers (Clock icon) > + Add Trigger.
 * 6. Choose: 'onFormSubmit' | 'From spreadsheet' | 'On form submit'.
 */

const MASTER_SHEET_ID = 'MASTER_SHEET_ID_HERE'; // <--- REPLACE THIS

/**
 * Main function triggered by form submission
 */
function onFormSubmit(e) {
  if (!e || !e.values) {
    Logger.log("Manual run detected. This function requires a real form submission trigger.");
    return;
  }

  const responses = e.values; 
  
  // Map based on latest form order:
  const formData = {
    address: responses[1],
    gender: responses[2],
    email: responses[3],
    phone: responses[4],
    dob: responses[5],
    grade: responses[6],
    board: responses[7],
    school: responses[8],
    hobbies: responses[9],
    fatherName: responses[10],
    fatherPhone: responses[11],
    fatherEmail: responses[12],
    fatherOccupation: responses[13],
    motherName: responses[14],
    motherPhone: responses[15],
    motherEmail: responses[16],
    motherOccupation: responses[17],
    source: responses[18],
    comments: responses[19],
    systemId: responses[20]
  };

  if (!formData.systemId) {
    Logger.log("No System ID found in response. Update aborted.");
    return;
  }

  try {
    const masterSs = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const sheet = masterSs.getSheetByName('Leads');
    if (!sheet) {
      Logger.log("Error: 'Leads' sheet not found in the Master Spreadsheet.");
      return;
    }

    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    const idToMatch = parseInt(formData.systemId);

    // Search for existing lead by ID (Column A)
    for (let i = 1; i < data.length; i++) {
      if (parseInt(data[i][0]) === idToMatch) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow !== -1) {
      // Update existing row (Columns I to Y)
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
      
      // Update basic contact info (Phone in Col C, Email in Col D)
      if (formData.phone) sheet.getRange(foundRow, 3).setValue(formData.phone);
      if (formData.email) sheet.getRange(foundRow, 4).setValue(formData.email);

      // Advance stage to 'Registration done' and update timestamp
      sheet.getRange(foundRow, 5).setValue('Registration done');
      sheet.getRange(foundRow, 7).setValue(new Date().toISOString());
      
      Logger.log("Successfully updated lead ID: " + idToMatch);
    } else {
      Logger.log("Error: Lead ID " + idToMatch + " not found in Master Sheet.");
    }
  } catch (err) {
    Logger.log("Fatal Error: " + err.message);
  }
}

/**
 * Utility to verify script connectivity
 */
function verifyScriptConnection() {
  Logger.log("EduCompass Script is active.");
  Logger.log("Target Sheet ID: " + MASTER_SHEET_ID);
}
