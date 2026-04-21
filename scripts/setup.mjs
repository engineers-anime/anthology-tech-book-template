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
  
  let currentState = {};
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    currentState = JSON.parse(data);
    console.log('※前回の設定内容を読み込みました。やり直す場合は新しい値を入力してください。');
  } catch (e) {
    // 初回：タグを基準にする
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    for (const q of MAIN_QUESTIONS) currentState[q.tag] = `{{${q.tag}}}`;
    currentState['REPOSITORY_NAME'] = packageJson.name;
    currentState['REPOSITORY_GIT_URL'] = `{{REPOSITORY_GIT_URL}}`;
  }

  const answers = {};
  for (const q of MAIN_QUESTIONS) {
    const displayDefault = (currentState[q.tag] && !currentState[q.tag].startsWith('{{')) ? currentState[q.tag] : q.default;
    const answer = await rl.question(`${q.label} [${displayDefault}]: `);
    answers[q.tag] = answer.trim() || displayDefault;
  }
  rl.close();

  // URLからリポジトリ情報を自動生成
  try {
    const repoUrl = answers.REPOSITORY_URL.replace(/\/$/, '');
    const repoPath = new URL(repoUrl).pathname.slice(1); // "owner/repo"
    answers.REPOSITORY_NAME = repoPath.split('/').pop();
    answers.REPOSITORY_GIT_URL = `git@github.com:${repoPath}.git`;
  } catch (e) {
    answers.REPOSITORY_NAME = currentState['REPOSITORY_NAME'] || 'repo-name';
    answers.REPOSITORY_GIT_URL = currentState['REPOSITORY_GIT_URL'] || 'git@github.com:user/repo.git';
  }
  
  console.log('\n設定を適用しています...');

  let nameChanged = false;
  const allTags = Object.keys(answers);

  for (const filePath of TARGET_FILES) {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);
      let content = await fs.readFile(fullPath, 'utf8');

      for (const tag of allTags) {
        const oldValue = currentState[tag] || `{{${tag}}}`;
        const newValue = answers[tag];
        if (oldValue === newValue) continue;

        if (tag === 'REPOSITORY_NAME' && filePath === 'package.json') nameChanged = true;

        const regex = new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, newValue);
      }
      await fs.writeFile(fullPath, content, 'utf8');
      console.log(`✔ Updated: ${filePath}`);
    } catch (err) {
      console.error(`✘ Error updating ${filePath}: ${err.message}`);
    }
  }

  await fs.writeFile(STATE_FILE, JSON.stringify(answers, null, 2), 'utf8');

  if (nameChanged) {
    console.log('\nパッケージ名を更新中...');
    try { 
      execSync('corepack yarn install', { stdio: 'inherit' }); 
      console.log('✔ yarn.lock が更新されました。');
    } catch (e) {
      console.warn('⚠ yarn install に失敗しました。手動で `yarn install` を実行してください。');
    }
  }

  console.log('\nセットアップ完了！');
}

setup().catch((err) => {
  console.error('\nセットアップ中にエラーが発生しました:', err.message);
  console.log('\n解決できない場合は node scripts/setup.mjs を直接実行してください。');
});
