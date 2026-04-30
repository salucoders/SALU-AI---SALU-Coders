import fs from 'fs';
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// The tricky part: we will use a regex if spaces don't perfectly match!
const regex = /}\)\.map\(\(m, i\) => \([\s]*<tr key=\{i\} className="hover:bg-zinc-50\/50 transition-colors">/m;

const search = content.match(regex);
console.log("Match found: ", search ? search[0] : false);

if (search) {
const fixed = `}).map((m, i) => {
                                    const session = sessions.find(s => s.id === m.sessionId);
                                    const user = session ? users.find(u => u.id === session.userId) : null;
                                    return (
                                    <tr key={i} onClick={() => setSelectedMessage({...m, user})} className="hover:bg-zinc-50/50 transition-colors cursor-pointer group">`;
const newContent = content.replace(regex, fixed);
fs.writeFileSync('src/components/AdminPanel.tsx', newContent);
console.log("Done");
}

const regex2 = /<th className="px-6 py-4 font-semibold text-zinc-500 text-\[10px\] uppercase tracking-widest leading-4">Sender Role<\/th>/m;
const search2 = content.match(regex2);
if (search2) {
   const newContent2 = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
   const fixed2 = `<th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Sender Role</th>
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">User</th>`;
   fs.writeFileSync('src/components/AdminPanel.tsx', newContent2.replace(regex2, fixed2));
   console.log("Done 2");
}

const regex3 = /<td className="px-6 py-4">\s*<span className=\{cn\(\s*"px-2\.5 py-1 rounded text-\[10px\] font-bold uppercase tracking-widest",\s*m\.role === 'user' \? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"\s*\)\}>\s*\{m\.role\}\s*<\/span>\s*<\/td>/m;
const search3 = content.match(regex3);
if (search3) {
   const newContent3 = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
   const fixed3 = `<td className="px-6 py-4">
                                          <span className={cn(
                                             "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
                                             m.role === 'user' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                          )}>
                                             {m.role}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4">
                                          {user ? (
                                            <div className="flex flex-col">
                                              <span className="text-sm font-semibold text-slate-800 line-clamp-1">{user.name}</span>
                                              <span className="text-[10px] text-zinc-400 line-clamp-1">{user.email}</span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-zinc-400 italic">Unknown</span>
                                          )}
                                       </td>`;
   fs.writeFileSync('src/components/AdminPanel.tsx', newContent3.replace(regex3, fixed3));
   console.log("Done 3");
}

const mapEndRegex = /<\/tr>\s*\)\)}/m;
const mapEndSearch = content.match(mapEndRegex);
if(mapEndSearch) {
   const newContent4 = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
   const endFixed = `</tr>
                                 )})}`;
   fs.writeFileSync('src/components/AdminPanel.tsx', newContent4.replace(mapEndRegex, endFixed));
   console.log("Done 4");
}
