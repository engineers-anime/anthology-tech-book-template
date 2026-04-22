const fs = require('fs');
const path = require('path');

// data.json から記事のファイル一覧を取得する
const dataPath = path.resolve(__dirname, '../scripts/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// すべての著者の記事ファイルを抽出
const chapterFiles = data.authors.flatMap(author => 
  author.articles.map(article => article.file)
);

// 固定ファイル
const topFiles = ['index.md', 'preface.md'];
const bottomFiles = ['authors.md', 'colophon.md'];

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
  entry: [
    ...topFiles,
    ...chapterFiles,
    ...bottomFiles,
  ],
  entryContext: path.join(__dirname, './manuscripts'),
  output: [path.join(__dirname, './output/ebook.pdf')],
  workspaceDir: path.join(__dirname, '../.vivliostyle'),
  toc: false,
  cover: undefined,
}
