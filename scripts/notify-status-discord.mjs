import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookJsonPath = path.resolve(__dirname, '../book/manuscripts/book.json');

async function getProposalsStatus(bookData) {
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

    let msg = `📋 **【執筆宣言・book.json 未登録者リスト】**\n`;
    if (missingAuthors.length === 0) {
      msg += `✅ 未登録の執筆宣言者はいません。全員 book.json に登録済みです。\n`;
    } else {
      msg += `⚠️ 執筆宣言 Issue を出していますが、まだ \`book.json\` に登録されていない方々です。\n\n`;
      for (const author of missingAuthors) {
        msg += `• @${author.id} (Issue: "${author.title}")\n`;
      }
      msg += `\n※ \`book.json\` への追加をお願いします。\n`;
    }
    return msg;
  } catch (error) {
    console.error('Error fetching proposals:', error.message);
    return '❌ 執筆宣言の取得に失敗しました。';
  }
}

async function getReviewsStatus(bookData) {
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

    let msg = `📊 **【相互レビュー進捗状況】**\n\n`;
    msg += `**■ 記事別レビュー数**\n`;
    for (const title of Object.keys(articleToAuthor)) {
      const stats = reviewStats[title] || { author: articleToAuthor[title], count: 0, reviewers: new Set() };
      const reviewersStr = Array.from(stats.reviewers).join(', ') || '-';
      msg += `• 「${title}」 (著者: ${stats.author}) - レビュー数: ${stats.count} (レビュアー: ${reviewersStr})\n`;
    }

    msg += `\n**■ レビュー貢献度 (Who reviewed Whom)**\n`;
    const sortedReviewers = Object.entries(reviewerStats).sort((a, b) => b[1].length - a[1].length);
    if (sortedReviewers.length === 0) {
      msg += `• まだレビューはありません。\n`;
    } else {
      for (const [reviewer, tasks] of sortedReviewers) {
        const taskList = tasks.map(t => `${t.author}さん(「${t.title}」)`).join(', ');
        msg += `• ${reviewer} - レビュー回数: ${tasks.length}回 (対象: ${taskList})\n`;
      }
    }
    return msg;
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    return '❌ レビュー進捗の取得に失敗しました。';
  }
}

async function run() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL is not set.');
    return;
  }

  const bookData = JSON.parse(await fs.readFile(bookJsonPath, 'utf8'));

  const proposalsMsg = await getProposalsStatus(bookData);
  const reviewsMsg = await getReviewsStatus(bookData);

  // 一度に両方送信すると文字数制限(2000文字)を超える可能性があるため、分割して送信する。
  const payloads = [
    { content: proposalsMsg },
    { content: reviewsMsg }
  ];

  for (const payload of payloads) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('✔ Discord notification sent successfully.');
    } catch (error) {
      console.error('✘ Error sending Discord notification:', error.message);
    }
  }
}

run().catch(console.error);
