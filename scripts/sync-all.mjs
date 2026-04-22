import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, 'data.json');
const rootDir = path.resolve(__dirname, '..');

async function syncAll() {
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));

  // 1. 各ファイルで使用する置換用タグマップを作成
  const repoPath = new URL(data.repositoryUrl).pathname.slice(1);
  const tags = {
    BOOK_TITLE: data.bookTitle,
    BOOK_AUTHOR: data.bookAuthor,
    BOOK_COVER: data.bookCover,
    REPOSITORY_URL: data.repositoryUrl,
    REPOSITORY_NAME: repoPath.split('/').pop(),
    REPOSITORY_GIT_URL: `git@github.com:${repoPath}.git`,
    EVENT_NAME: data.event.name,
    EVENT_URL: data.event.url,
    EVENT_DATE: data.event.date,
    DUE_DATE_MANUSCRIPT: data.deadlines.manuscript,
    DUE_DATE_PAGE_CONFIRM: data.deadlines.pageConfirm,
    DUE_DATE_COVER: data.deadlines.cover,
    DUE_DATE_SUBMISSION: data.deadlines.submission,
    PRINTER_NAME: data.printer.name,
    PRINTER_URL: data.printer.url,
  };

  // 2. グローバルな置換処理（タグ形式の置換）
  const targetFiles = [
    'README.md',
    'package.json',
    'book/vivliostyle.config.js',
    'book/manuscripts/index.md',
    'book/manuscripts/colophon.md',
  ];

  for (const relPath of targetFiles) {
    const filePath = path.join(rootDir, relPath);
    try {
      let content = await fs.readFile(filePath, 'utf8');
      let updated = false;
      for (const [tag, value] of Object.entries(tags)) {
        const placeholder = `{{${tag}}}`;
        if (content.includes(placeholder)) {
          content = content.split(placeholder).join(value);
          updated = true;
        }
      }
      if (updated) await fs.writeFile(filePath, content, 'utf8');
    } catch (e) {}
  }

  // 3. 各原稿（Manuscripts）の同期
  for (const author of data.authors) {
    for (const article of author.articles) {
      const filePath = path.join(rootDir, 'book/manuscripts', article.file);
      try {
        let content = await fs.readFile(filePath, 'utf8');
        let updated = false;
        
        // H1置換
        const h1Regex = /^#\s+.+$/m;
        if (h1Regex.test(content)) { content = content.replace(h1Regex, `# ${article.title}`); updated = true; }
        
        // フロントマター置換
        const titleDiv = /<div class="doc-title">[\s\S]*?<\/div>/;
        const authorDiv = /<div class="doc-author">[\s\S]*?<\/div>/;
        if (titleDiv.test(content)) { content = content.replace(titleDiv, `<div class="doc-title">${article.title}</div>`); updated = true; }
        if (authorDiv.test(content)) { content = content.replace(authorDiv, `<div class="doc-author">${author.name}</div>`); updated = true; }
        
        if (updated) await fs.writeFile(filePath, content, 'utf8');
      } catch (e) {}
    }
  }

  // 4. 目次 (TOC) の生成
  const indexPath = path.join(rootDir, 'book/manuscripts/index.md');
  const indexContent = await fs.readFile(indexPath, 'utf8');
  const tocItems = [`1. [はじめに](preface.html)`];
  for (const author of data.authors) {
    for (const article of author.articles) {
      tocItems.push(`1. [${article.title}](${article.file.replace('.md', '.html')})`);
    }
  }
  tocItems.push(`1. [著者紹介](authors.html)`);
  
  const frontmatter = (indexContent.match(/^---[\s\S]+?---/) || [''])[0];
  const newIndex = `${frontmatter}\n\n# ${data.bookTitle}\n\n<nav id="toc" role="doc-toc">\n\n## 目次\n\n${tocItems.join('\n')}\n\n</nav>\n`;
  await fs.writeFile(indexPath, newIndex.trim() + '\n', 'utf8');

  // 5. 著者紹介ページの生成
  const authorsPath = path.join(rootDir, 'book/manuscripts/authors.md');
  const authorCards = data.authors.map(author => `
<div class="author_container">
    <div class="author_icon_container"><img class="author_icon" src="${author.icon}" alt="${author.name}"></div>
    <div class="author_info_container">
        <div class="author_name"><b>${author.name}</b>（X: ${author.x}）</div>
        <div class="author-info-block">
            <div>執筆: ${author.articles.map(a => a.title).join('/<br/>')}</div>
            <div class="author_job">お仕事: ${author.job}</div>
            <div class="author_favolite_anime">好きなアニメ: ${author.favorites.join('/')}</div>
        </div>
    </div>
</div>`).join('\n');
  const authorsContent = `---
class: content
---
<div class="doc-header"><h1>著者紹介</h1></div>
# 著者紹介
<!-- Generated from scripts/data.json -->
${authorCards}
`;
  await fs.writeFile(authorsPath, authorsContent);

  console.log('✔ All files synced with data.json');
}

syncAll().catch(console.error);
