import fs from 'fs';
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const search = `                                 }).map((m, i) => (
                                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">`;
console.log("IndexOf:", content.indexOf(search));

const fixed = content.replace(search, `                                 }).map((m, i) => {
                                    const session = sessions.find(s => s.id === m.sessionId);
                                    const user = session ? users.find(u => u.id === session.userId) : null;
                                    return (
                                    <tr key={i} onClick={() => setSelectedMessage({...m, user})} className="hover:bg-zinc-50/50 transition-colors cursor-pointer group">`);
fs.writeFileSync('src/components/AdminPanel.tsx', fixed);
