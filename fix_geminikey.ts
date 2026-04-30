import fs from 'fs';
let content = fs.readFileSync('src/services/gemini.ts', 'utf8');

content = content.replace(/config\.apiKeys\[Math\.floor\(Math\.random\(\) \* config\.apiKeys\.length\)\] : config\.apiKey;/g, 'config.apiKeys[Math.floor(Math.random() * config.apiKeys.length)] : config.apiKeys[0];');

content = content.replace(/apiKey: apiKeys\[0\] \|\| "", /g, '');

content = content.replace(/const activeKey = config\.imageGenApiKey \|\| config\.apiKey;/g, `const activeKey = config.imageGenApiKey || (config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys[0] : "");`);

content = content.replace(/if \(!config\.apiKey\) \{/g, `if (!config.apiKeys || config.apiKeys.length === 0) {`);

content = content.replace(/const ai = new GoogleGenAI\(\{ apiKey: config\.apiKey \}\);/g, `const ai = new GoogleGenAI({ apiKey: config.apiKeys[0] });`);

fs.writeFileSync('src/services/gemini.ts', content);
