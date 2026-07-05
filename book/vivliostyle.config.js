// Generated from book/manuscripts/book.json
// ここより下は直接編集せずに、book.json を編集してください

const fs = require('fs');
const path = require('path');

// book.json から記事のファイル一覧を取得する
const dataPath = path.resolve(__dirname, './manuscripts/book.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 全ファイルのリストを作成（重複を除外してVivliostyleのビルドエラーを防ぎます）
const entry = [...new Set([
  'index.md',
  ...data.frontmatter.map(item => item.file),
  ...data.authors.flatMap(author => author.articles.map(article => article.file)),
  ...data.backmatter.map(item => item.file),
])];

module.exports = {
  title: data.bookTitle,
  author: data.bookAuthor,
  language: 'ja',
  size: 'A5',
  theme: [
    'vivliostyle-theme-macneko-techbook@0.5.0',
    '@mitsuharu/vivliostyle-theme-noto-sans-jp@0.1.4',
    path.join(__dirname, 'theme/theme-custom'),
  ],
  entry: entry,
  entryContext: path.join(__dirname, './manuscripts'),
  output: [path.join(__dirname, './output/ebook.pdf')],
  workspaceDir: path.join(__dirname, '../.vivliostyle'),
  toc: false,
  cover: undefined,
}
