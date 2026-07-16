const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'cloud_school_app.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = "function saveBookToFirebase(book) { if (serverAvailable) serverSave('curriculum_modules', book); }\nfunction saveQuizToFirebase(quiz) { if (serverAvailable) serverSave('assignments', quiz); }\nfunction saveSubmissionToFirebase(sub) { if (serverAvailable) serverSave('submissions', sub); }\nfunction saveStudentToFirebase(student) { if (serverAvailable) serverSave('students', student); }";

if (code.includes(targetStr)) {
  code = code.replace(targetStr, "// Save functions moved earlier to support offline sync.");
  fs.writeFileSync(filePath, code, 'utf8');
  console.log("SUCCESSFULLY REMOVED DUPLICATE SAVE FUNCTIONS!");
} else {
  // Try line by line or with CRLF
  const targetStrCRLF = targetStr.replace(/\n/g, "\r\n");
  if (code.includes(targetStrCRLF)) {
    code = code.replace(targetStrCRLF, "// Save functions moved earlier to support offline sync.");
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("SUCCESSFULLY REMOVED DUPLICATE SAVE FUNCTIONS (CRLF)!");
  } else {
    console.error("COULD NOT FIND DUPLICATE SAVE FUNCTIONS!");
  }
}
