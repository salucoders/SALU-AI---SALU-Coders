import fs from 'fs';
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const lines = content.split('\n');
lines[972] = lines[972].replace('))}',')})}');
fs.writeFileSync('src/components/AdminPanel.tsx', lines.join('\n'));
