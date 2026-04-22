import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '../book/manuscripts/book.json');
const statePath = path.resolve(__dirname, '../.sync-state.json');
const rootDir = path.resolve(__dirname, '..');

const WARNING_COMMENT = `<!-- Generated from book/manuscripts/book.json -->
<!-- ここより下は直接編集せずに、book.json を編集してください -->`;

const WARNING_COMMENT_JS = `// Generated from book/manuscripts/book.json
// ここより下は直接編集せずに、book.json を編集してください`;

async function syncAll() {
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  
  let prevState = {};
  try {
    prevState = JSON.parse(await fs.readFile(statePath, 'utf8'));
  } catch (e) {}

  console.log('✔ Syncing with book.json...');

  let repoPath = '';
  try {
    if (data.repositoryUrl && !data.repositoryUrl.includes('{{')) {
      repoPath = new URL(data.repositoryUrl).pathname.slice(1);
    }
  } catch (e) {}

  const currentTags = {
    BOOK_TITLE: data.bookTitle,
    BOOK_AUTHOR: data.bookAuthor,
    BOOK_COVER: data.bookCover,
    REPOSITORY_URL: data.repositoryUrl,
    REPOSITORY_NAME: repoPath ? repoPath.split('/').pop() : '{{REPOSITORY_NAME}}',
    REPOSITORY_GIT_URL: repoPath ? `git@github.com:${repoPath}.git` : '{{REPOSITORY_GIT_URL}}',
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

  const targetFiles = [
    { path: 'README.md', type: 'md' },
    { path: 'package.json', type: 'json' },
    { path: 'book/vivliostyle.config.js', type: 'js' },
    { path: 'book/manuscripts/index.md', type: 'md' },
    { path: 'book/manuscripts/colophon.md', type: 'md' },
  ];

  for (const target of targetFiles) {
    const filePath = path.join(rootDir, target.path);
    try {
      let content = await fs.readFile(filePath, 'utf8');
      let updated = false;

      for (const [tag, newValue] of Object.entries(currentTags)) {
        const placeholder = `{{${tag}}}`;
        const oldValue = prevState[tag];

        // 1. タグ形式 {{TAG}} があれば置換
        if (content.includes(placeholder) && placeholder !== newValue) {
          content = content.split(placeholder).join(newValue);
          updated = true;
        } 
        // 2. 前回の値(oldValue)がファイル内にあり、かつ新しい値と異なるなら置換
        else if (oldValue && oldValue !== newValue && content.includes(oldValue)) {
          content = content.split(oldValue).join(newValue);
          updated = true;
        }
      }

      if (target.type === 'md' && !content.includes(WARNING_COMMENT)) {
        content = WARNING_COMMENT + '\n\n' + content;
        updated = true;
      } else if (target.type === 'js' && !content.includes(WARNING_COMMENT_JS)) {
        content = WARNING_COMMENT_JS + '\n\n' + content;
        updated = true;
      }

      if (updated) await fs.writeFile(filePath, content, 'utf8');
    } catch (e) {}
  }

  // Manuscripts 同期
  for (const author of data.authors) {
    for (const article of author.articles) {
      const filePath = path.join(rootDir, 'book/manuscripts', article.file);
      try {
        let content = await fs.readFile(filePath, 'utf8');
        let updated = false;
        const h1Regex = /^#\s+.+$/m;
        if (h1Regex.test(content)) { content = content.replace(h1Regex, `# ${article.title}`); updated = true; }
        const titleDiv = /<div class="doc-title">[\s\S]*?<\/div>/;
        const authorDiv = /<div class="doc-author">[\s\S]*?<\/div>/;
        if (titleDiv.test(content)) { content = content.replace(titleDiv, `<div class="doc-title">${article.title}</div>`); updated = true; }
        if (authorDiv.test(content)) { content = content.replace(authorDiv, `<div class="doc-author">${author.name}</div>`); updated = true; }
        if (updated) await fs.writeFile(filePath, content, 'utf8');
      } catch (e) {}
    }
  }

  // TOC / Authors 生成
  const indexPath = path.join(rootDir, 'book/manuscripts/index.md');
  const tocItems = [];
  const addToToc = (items) => {
    if (!items) return;
    for (const item of items) {
      if (item.showInToc === false) continue;
      tocItems.push(`1. [${item.title}](${item.file.replace('.md', '.html')})`);
    }
  };
  addToToc(data.frontmatter);
  for (const author of data.authors) addToToc(author.articles);
  addToToc(data.backmatter);
  
  const indexContent = await fs.readFile(indexPath, 'utf8');
  const frontmatterMatch = indexContent.match(/^---[\s\S]+?---/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
  const newIndex = `${WARNING_COMMENT}\n${frontmatter}\n\n# ${data.bookTitle}\n\n<nav id="toc" role="doc-toc">\n\n## 目次\n\n${tocItems.join('\n')}\n\n</nav>\n`;
  await fs.writeFile(indexPath, newIndex.trim() + '\n', 'utf8');

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
  await fs.writeFile(authorsPath, `---
class: content
---
${WARNING_COMMENT}
<div class="doc-header"><h1>著者紹介</h1></div>
${authorCards}
`);

  await fs.writeFile(statePath, JSON.stringify(currentTags, null, 2), 'utf8');
  console.log('✔ All files synced with book.json');
}

syncAll().catch(console.error);
