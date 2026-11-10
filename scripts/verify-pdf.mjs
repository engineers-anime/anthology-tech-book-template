import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const defaultPdf = fileURLToPath(new URL('../book/output/ebook.pdf', import.meta.url));
const pdfPath = process.argv[2] ?? defaultPdf;
const { bookTitle, pdfFontPrefix = 'NotoSansJP-' } = JSON.parse(
  readFileSync(new URL('../book/manuscripts/book.json', import.meta.url), 'utf8'),
);
const normalize = (text) => text.normalize('NFKC').replace(/\s/gu, '');
const commandOptions = { encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024 };

try {
  if (typeof pdfFontPrefix !== 'string' || !pdfFontPrefix.trim()) {
    throw new Error('book.json の pdfFontPrefix にフォント名の接頭辞を指定してください。');
  }

  // 日本語が欠落していても PDF は生成されるため、実際の文字列を検査する。
  const text = execFileSync('pdftotext', [pdfPath, '-'], commandOptions);
  if (!normalize(text).includes(normalize(bookTitle))) {
    throw new Error(`PDF から書籍タイトルを抽出できません: ${bookTitle}`);
  }

  const fontTable = execFileSync('pdffonts', [pdfPath], commandOptions);
  const matchingFonts = fontTable.split('\n').slice(2)
    .map((line) => line.trim().split(/\s+/u))
    .filter(([name]) => name.replace(/^[A-Z]{6}\+/u, '').startsWith(pdfFontPrefix));
  // type 列の語数はフォント形式によって異なる。emb 列は末尾から5列目。
  if (matchingFonts.length === 0 || matchingFonts.some((columns) => columns.at(-5) !== 'yes')) {
    throw new Error(`${pdfFontPrefix} で始まるフォントの埋め込みを確認できません:\n${fontTable}`);
  }

  console.log(`✔ 書籍タイトルと ${pdfFontPrefix} で始まるフォントの埋め込みを確認しました: ${pdfPath}`);
  console.log(fontTable);
} catch (error) {
  console.error(error.message);
  if (error.code === 'ENOENT') {
    console.error('pdftotext / pdffonts が必要です（Ubuntu: apt-get install poppler-utils）。');
  }
  process.exitCode = 1;
}
