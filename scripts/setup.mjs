import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const STATE_FILE = '.setup-state.json';
const TARGET_FILES = [
  'README.md',
  'package.json',
  'book/vivliostyle.config.js',
  'book/manuscripts/index.md',
  'book/manuscripts/colophon.md',
];

// 日付計算用のヘルパー
const now = new Date();
const eventDateDefault = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
const formatDate = (date) => date.toISOString().split('T')[0].replace(/-/g, '/');
const getRelativeDate = (days) => {
  const d = new Date(eventDateDefault);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// ユーザーに直接聞く項目
const MAIN_QUESTIONS = [
  { tag: 'BOOK_TITLE', label: '書籍タイトル', default: 'エンジニアニメAnthology Tech Book' },
  { tag: 'BOOK_AUTHOR', label: '著者名/サークル名', default: 'エンジニアニメ' },
  { tag: 'REPOSITORY_URL', label: 'GitHub リポジトリURL', default: 'https://github.com/engineers-anime/study-from-anime-tbf20' },
  { tag: 'EVENT_NAME', label: 'イベント名', default: '技術書典20' },
  { tag: 'EVENT_URL', label: 'イベントURL', default: 'https://techbookfest.org/event/tbf20' },
  { tag: 'EVENT_DATE', label: 'イベント開催日', default: formatDate(eventDateDefault) },
  { tag: 'DUE_DATE_MANUSCRIPT', label: '原稿締切日', default: getRelativeDate(-25) },
  { tag: 'DUE_DATE_PAGE_CONFIRM', label: 'ページ数確定日', default: getRelativeDate(-23) },
  { tag: 'DUE_DATE_COVER', label: '表紙締切日', default: getRelativeDate(-22) },
  { tag: 'DUE_DATE_SUBMISSION', label: '最終入稿日', default: getRelativeDate(-21) },
  { tag: 'PRINTER_NAME', label: '印刷所名', default: '日光企画' },
  { tag: 'PRINTER_URL', label: '印刷所URL', default: 'https://www.nikko-pc.com/site/' },
];

async function setup() {
  console.log('--- エンジニアニメ 執筆環境セットアップ ---');
  
  // 前回の状態を読み込む
  let prevState = {};
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    prevState = JSON.parse(data);
    console.log('※前回の設定内容を読み込みました。');
  } catch (e) {
    console.log('※初回セットアップを開始します。');
  }

  // package.json の現在の名前を REPOSITORY_NAME の初期値候補にする
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const currentPackageName = packageJson.name;

  const answers = {};
  for (const q of MAIN_QUESTIONS) {
    const displayDefault = prevState[q.tag] || q.default;
    const answer = await rl.question(`${q.label} [${displayDefault}]: `);
    answers[q.tag] = answer.trim() || displayDefault;
  }
  rl.close();

  // 自動算出
  try {
    const repoUrl = answers.REPOSITORY_URL.replace(/\/$/, '');
    const repoPath = new URL(repoUrl).pathname.slice(1);
    answers.REPOSITORY_NAME = repoPath.split('/').pop();
    answers.REPOSITORY_GIT_URL = `git@github.com:${repoPath}.git`;
  } catch (e) {
    answers.REPOSITORY_NAME = currentPackageName;
    answers.REPOSITORY_GIT_URL = `git@github.com:unknown/repo.git`;
  }

  console.log('\n設定を適用しています...');

  for (const filePath of TARGET_FILES) {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);
      let content = await fs.readFile(fullPath, 'utf8');
      let updated = false;

      for (const [tag, newValue] of Object.entries(answers)) {
        // 1. タグ形式 {{TAG}} を置換
        const tagPlaceholder = `{{${tag}}}`;
        if (content.includes(tagPlaceholder)) {
          content = content.split(tagPlaceholder).join(newValue);
          updated = true;
        }

        // 2. 前回の値があれば、それも置換（やり直し用）
        const oldValue = prevState[tag];
        if (oldValue && oldValue !== newValue && content.includes(oldValue)) {
          content = content.split(oldValue).join(newValue);
          updated = true;
        }
        
        // 特殊ケース: REPOSITORY_NAME が package.json の name にそのまま入っている場合
        if (tag === 'REPOSITORY_NAME' && filePath === 'package.json' && content.includes(`"name": "${currentPackageName}"`)) {
          content = content.replace(`"name": "${currentPackageName}"`, `"name": "${newValue}"`);
          updated = true;
        }
      }

      if (updated) {
        await fs.writeFile(fullPath, content, 'utf8');
        console.log(`✔ Updated: ${filePath}`);
      } else {
        console.log(`- No changes needed: ${filePath}`);
      }
    } catch (err) {
      console.error(`✘ Error updating ${filePath}: ${err.message}`);
    }
  }

  // 状態を保存
  await fs.writeFile(STATE_FILE, JSON.stringify(answers, null, 2), 'utf8');

  // package.json の名前が変わった場合のみ yarn install
  if (currentPackageName !== answers.REPOSITORY_NAME) {
    console.log('\nパッケージ名が変更されたため、yarn.lock を更新しています...');
    try {
      execSync('corepack yarn install', { stdio: 'inherit' });
      console.log('✔ yarn.lock が更新されました。');
    } catch (err) {
      console.warn('⚠ yarn install に失敗しました。手動で `yarn install` を実行してください。');
    }
  }

  console.log('\nセットアップが完了しました！');
}

setup().catch(console.error);
