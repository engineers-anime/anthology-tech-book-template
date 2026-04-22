import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookJsonPath = path.resolve(__dirname, '../book/manuscripts/book.json');
const outputMdPath = path.resolve(__dirname, '../docs/review_status.md');

async function syncReviews() {
  console.log('🔍 Fetching review issues from GitHub...');

  const bookData = JSON.parse(await fs.readFile(bookJsonPath, 'utf8'));
  const articleToAuthor = {};
  for (const author of bookData.authors) {
    for (const article of author.articles) {
      articleToAuthor[article.title] = author.name;
    }
  }

  try {
    const feedbackIssuesJson = execSync(
      'gh issue list --label "article_feedback" --state all --limit 1000 --json title,author',
      { encoding: 'utf8' }
    );
    const feedbackIssues = JSON.parse(feedbackIssuesJson);

    const reviewStats = {}; 
    const reviewerStats = {}; 

    for (const issue of feedbackIssues) {
      const title = issue.title.replace('【記事フィードバック】', '').trim();
      const reviewer = `@${issue.author.login}`;
      const author = articleToAuthor[title] || '不明';

      if (!reviewStats[title]) {
        reviewStats[title] = { author, count: 0, reviewers: new Set() };
      }
      reviewStats[title].count++;
      reviewStats[title].reviewers.add(reviewer);

      if (!reviewerStats[reviewer]) {
        reviewerStats[reviewer] = [];
      }
      reviewerStats[reviewer].push({ title, author });
    }
// Markdown 生成
let md = `<!-- このファイルは yarn sync:reviews によって自動生成されます。直接編集しないでください。 -->\n\n`;
md += `# 相互レビュー進捗状況\n\n`;
    md += `最終更新: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (JST)\n\n`;

    md += `## 記事別レビュー数\n\n`;
    md += `| 記事タイトル | 著者 | レビュー数 | レビュアー |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    
    for (const title of Object.keys(articleToAuthor)) {
      const stats = reviewStats[title] || { author: articleToAuthor[title], count: 0, reviewers: new Set() };
      md += `| ${title} | ${stats.author} | ${stats.count} | ${Array.from(stats.reviewers).join(', ') || '-'} |\n`;
    }

    md += `\n## レビュー貢献度 (Who reviewed Whom)\n\n`;
    md += `| レビュアー | レビュー回数 | レビューした相手 (記事) |\n`;
    md += `| :--- | :--- | :--- |\n`;

    const sortedReviewers = Object.entries(reviewerStats).sort((a, b) => b[1].length - a[1].length);
    for (const [reviewer, tasks] of sortedReviewers) {
      const taskList = tasks.map(t => `${t.author} (${t.title})`).join('<br/>');
      md += `| ${reviewer} | ${tasks.length} | ${taskList} |\n`;
    }

    await fs.writeFile(outputMdPath, md, 'utf8');
    console.log(`✔ Generated: ${outputMdPath}`);

  } catch (error) {
    console.error('✘ Error fetching reviews:', error.message);
  }
}

syncReviews();
