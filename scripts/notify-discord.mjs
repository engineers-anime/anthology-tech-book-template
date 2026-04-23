import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookJsonPath = path.resolve(__dirname, '../book/manuscripts/book.json');

async function notify() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return;

  const event = JSON.parse(await fs.readFile(eventPath, 'utf8'));
  const bookData = JSON.parse(await fs.readFile(bookJsonPath, 'utf8'));

  const action = event.action;
  const isComment = !!event.comment;
  
  // アクションに応じた表示設定
  const actionConfig = {
    opened: { label: '新規投稿', emoji: '🆕' },
    created: { label: '新規コメント', emoji: '💬' },
    edited: { label: '編集', emoji: '📝' },
    deleted: { label: '削除', emoji: '🗑️' },
    closed: { label: 'クローズ', emoji: '✅' },
    reopened: { label: '再開', emoji: '🔄' },
    labeled: { label: 'ラベル追加', emoji: '🏷️' },
    unlabeled: { label: 'ラベル除去', emoji: '➖' }
  };
  const config = actionConfig[action] || { label: action, emoji: '🔔' };

  let payload = null;

  // 1. 執筆宣言 (Chapter Proposal)
  if (event.issue && event.issue.labels.some(l => l.name === 'chapter_proposal')) {
    const mentionId = process.env.DISCORD_MENTION_ID_ORGANIZER;
    const mention = mentionId ? `<@${mentionId}> ` : '';
    
    payload = {
      content: `${mention}${config.emoji} **執筆宣言（${config.label}）**\n\nタイトル: ${event.issue.title}\nユーザー: @${(event.comment || event.issue).user.login}\nURL: ${(event.comment || event.issue).html_url}`,
    };
  }

  // 2. 記事フィードバック (Article Feedback)
  else if (event.issue && event.issue.labels.some(l => l.name === 'article_feedback')) {
    const title = event.issue.title.replace('【記事フィードバック】', '').trim();
    const authorData = bookData.authors.find(author => 
      author.articles.some(article => article.title === title)
    );

    let mention = '';
    if (authorData && authorData.discord) {
      mention = /^\d+$/.test(authorData.discord) ? `<@${authorData.discord}> ` : `@${authorData.discord} `;
    }

    const typeLabel = isComment ? `コメント${config.label}` : `Issue${config.label}`;
    payload = {
      content: `${mention}${config.emoji} **記事フィードバック（${typeLabel}）**\n\n対象記事: ${title}\nユーザー: @${(event.comment || event.issue).user.login}\nURL: ${(event.comment || event.issue).html_url}`,
    };
  }

  if (payload) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(`✔ Discord notification sent: ${action}`);
    } catch (error) {
      console.error('✘ Error sending Discord notification:', error.message);
    }
  }
}

notify().catch(console.error);
