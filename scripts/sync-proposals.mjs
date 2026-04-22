import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookJsonPath = path.resolve(__dirname, '../book/manuscripts/book.json');
const outputMdPath = path.resolve(__dirname, '../docs/proposal_status.md');

async function syncProposals() {
  console.log('🔍 Checking for unregistered chapter proposals...');

  const bookData = JSON.parse(await fs.readFile(bookJsonPath, 'utf8'));
  const registeredGithubIds = new Set(
    bookData.authors.map(a => (a.github || '').replace('@', '').toLowerCase())
  );

  try {
    const proposalIssuesJson = execSync(
      'gh issue list --label "chapter_proposal" --state all --limit 1000 --json title,author',
      { encoding: 'utf8' }
    );
    const proposalIssues = JSON.parse(proposalIssuesJson);

    const missingAuthors = [];
    for (const issue of proposalIssues) {
      const githubId = issue.author.login.toLowerCase();
      if (!registeredGithubIds.has(githubId)) {
        missingAuthors.push({ id: githubId, title: issue.title });
      }
    }

    let md = `<!-- このファイルは yarn sync:proposals によって自動生成されます。直接編集しないでください。 -->\n\n`;
    md += `# 執筆宣言・未登録者リスト\n\n`;
    md += `最終更新: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (JST)\n\n`;

    if (missingAuthors.length === 0) {
      md += `✅ 現在、未登録の執筆宣言者はいません。全員 book.json に登録済みです。\n`;
    } else {
      md += `## ⚠️ book.json 未登録の執筆宣言者\n`;
      md += `執筆宣言 Issue を出していますが、まだ \`book.json\` に登録されていない方々です。\n\n`;
      md += `| GitHub ID | Issue タイトル |\n`;
      md += `| :--- | :--- |\n`;
      for (const author of missingAuthors) {
        md += `| @${author.id} | ${author.title} |\n`;
      }
    }

    await fs.writeFile(outputMdPath, md, 'utf8');
    console.log(`✔ Generated: ${outputMdPath}`);

  } catch (error) {
    console.error('✘ Error checking proposals:', error.message);
  }
}

syncProposals();
