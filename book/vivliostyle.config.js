const fs = require('fs');
const path = require('path');

// manuscripts ディレクトリ内の md ファイルを自動収集する
const manuscriptsDir = path.join(__dirname, 'manuscripts');
const allFiles = fs.readdirSync(manuscriptsDir);

// 固定で順番を指定したいファイル
const topFiles = ['index.md', 'preface.md'];
const bottomFiles = ['authors.md', 'colophon.md'];

// それ以外の章（manuscripts 直下の md ファイル）
const chapterFiles = allFiles
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !topFiles.includes(file) && !bottomFiles.includes(file))
  .sort(); // 名前順に並べる

module.exports = {
  title: '{{BOOK_TITLE}}',
  author: '{{BOOK_AUTHOR}}',
  language: 'ja',
  size: 'A5',
  theme: [
    'vivliostyle-theme-macneko-techbook@0.5.0',
    '@mitsuharu/vivliostyle-theme-noto-sans-jp@0.1.4',
    'theme/theme-custom',
  ],
  entry: [
    ...topFiles,
    ...chapterFiles,
    ...bottomFiles,
  ],
  entryContext: './manuscripts',
  output: ['output/ebook.pdf'],
  workspaceDir: '.vivliostyle',
  toc: false,
  cover: undefined,
}
