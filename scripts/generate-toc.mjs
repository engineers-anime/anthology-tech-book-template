import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manuscriptsDir = path.resolve(__dirname, '../book/manuscripts');
const indexPath = path.join(manuscriptsDir, 'index.md');

// 固定で順番を指定したいファイル（book/vivliostyle.config.js と合わせる）
const topFiles = ['index.md', 'preface.md'];
const bottomFiles = ['authors.md', 'colophon.md'];

async function generateToc() {
  const allFiles = await fs.readdir(manuscriptsDir);
  
  // 対象のMarkdownファイルを収集
  const chapterFiles = allFiles
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !topFiles.includes(file) && !bottomFiles.includes(file))
    .sort();

  const targetFiles = ['preface.md', ...chapterFiles, 'authors.md'];
  const tocItems = [];

  for (const file of targetFiles) {
    const content = await fs.readFile(path.join(manuscriptsDir, file), 'utf8');
    const htmlName = file.replace('.md', '.html');
    
    // H1 (# Title) のみ抽出
    const lines = content.split('\n');
    for (const line of lines) {
      const h1Match = line.match(/^#\s+(.+)$/);
      
      if (h1Match) {
        // リンク付きのH1を追加
        tocItems.push(`1. [${h1Match[1].trim()}](${htmlName})`);
        break; // 各ファイル最初のH1のみ取得
      }
    }
  }

  // index.md を読み込んでタイトル部分を維持しつつ目次を置換
  const indexContent = await fs.readFile(indexPath, 'utf8');
  
  // フロントマター（--- ... ---）を抽出
  const frontmatterMatch = indexContent.match(/^---[\s\S]+?---/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
  
  // タイトル行（# Title）を抽出
  const titleMatch = indexContent.match(/#\s+(.+)/);
  const title = titleMatch ? titleMatch[0] : '# {{BOOK_TITLE}}';

  // フロントマターとタイトルの間の空行を制御しつつ結合
  const newIndexContent = `${frontmatter}

${title}

<nav id="toc" role="doc-toc">

## 目次

${tocItems.join('\n')}

</nav>
`;

  await fs.writeFile(indexPath, newIndexContent.trim() + '\n', 'utf8');
  console.log('✔ index.md の目次を更新しました');
}

generateToc().catch(console.error);
