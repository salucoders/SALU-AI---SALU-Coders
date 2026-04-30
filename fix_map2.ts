import fs from 'fs';
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex1 = /<th className="px-6 py-4 font-semibold text-zinc-500 text-\[10px\] uppercase tracking-widest leading-4">Attachments<\/th>/m;
content = content.replace(regex1, `<th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4 text-right">Action</th>`);

const regex2 = /<td className="px-6 py-4">\s*\{m\.attachments\?\.length > 0 \? \(\s*<span className="text-\[10px\] font-bold text-indigo-600 bg-indigo-50 px-2\.5 py-1 rounded border border-indigo-100">\s*\{m\.attachments\.length\} ASSETS\s*<\/span>\s*\) : \(\s*<span className="text-zinc-300 text-\[10px\] font-semibold uppercase tracking-widest">NONE<\/span>\s*\)\}\s*<\/td>/m;

content = content.replace(regex2, `<td className="px-6 py-4 text-right w-24">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedMessage({...m, user}); }}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors inline-block"
                                          >
                                            View
                                          </button>
                                       </td>`);
fs.writeFileSync('src/components/AdminPanel.tsx', content);
console.log("Done");
