// scripts/gen-types.js
const { execSync } = require('child_process');
const fs = require('fs');

const PROJECT_REF = 'ISI_PROJECT_REF_KAMU'; // ganti sesuai project ref Supabase

const output = execSync(
  `npx supabase gen types typescript --project-id ${PROJECT_REF} --schema public`,
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 }
);

fs.writeFileSync('types/database.types.ts', output, { encoding: 'utf8' });
console.log('Selesai, ' + output.length + ' karakter ditulis.');