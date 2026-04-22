import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, 'data.json');
const manuscriptsDir = path.resolve(__dirname, '../book/manuscripts');

async function syncManuscripts() {
  const authorsData = JSON.parse(await fs.readFile(dataPath, 'utf8'));

  for (const author of authorsData) {
    for (const article of author.articles) {
      const filePath = path.join(manuscriptsDir, article.file);
      
      try {
        let content = await fs.readFile(filePath, 'utf8');
        let updated = false;

        // 1. フロントマター内の doc-title / doc-author を置換
        const titleRegex = /<div class="doc-title">[\s\S]*?<\/div>/;
        const authorRegex = /<div class="doc-author">[\s\S]*?<\/div>/;

        if (titleRegex.test(content)) {
          content = content.replace(titleRegex, `<div class="doc-title">${article.title}</div>`);
          updated = true;
        }
        if (authorRegex.test(content)) {
          content = content.replace(authorRegex, `<div class="doc-author">${author.name}</div>`);
          updated = true;
        }

        // 2. 本文最初の H1 (# Title) を置換
        const h1Regex = /^#\s+.+$/m;
        if (h1Regex.test(content)) {
          content = content.replace(h1Regex, `# ${article.title}`);
          updated = true;
        }

        if (updated) {
          await fs.writeFile(filePath, content, 'utf8');
          console.log(`✔ Synced: ${article.file} (${article.title})`);
        }
      } catch (err) {
        console.error(`✘ Error syncing ${article.file}: ${err.message}`);
      }
    }
  }
}

syncManuscripts().catch(console.error);
