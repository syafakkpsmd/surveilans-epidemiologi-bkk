const fs = require('fs');

// Ganti 'credentials.json' dengan nama file JSON yang Anda letakkan di root project
const rawData = fs.readFileSync('./project.json', 'utf8');
const key = JSON.parse(rawData);

console.log(`GOOGLE_SERVICE_ACCOUNT_EMAIL="${key.client_email}"`);
console.log(`GOOGLE_PRIVATE_KEY="${key.private_key.replace(/\n/g, '\\n')}"`);
console.log(`GOOGLE_DRIVE_FOLDER_ID="1M9AUL-dtQGI8CvImEM_ujmaHKm6ifHVN"`);