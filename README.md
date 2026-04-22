<!-- Generated from book/manuscripts/book.json -->
<!-- ここより下は直接編集せずに、book.json を編集してください -->

# {{BOOK_TITLE}}

エンジニアリングとアニメ（あるいはアニメ文化）をテーマにした技術同人誌「{{BOOK_TITLE}}」を制作するためのテンプレートリポジトリです。
本書は **[{{EVENT_NAME}}]({{EVENT_URL}})** での頒布を予定しています。

## 初期セットアップ

本テンプレートからリポジトリを作成した後、以下のファイルを開き、プロジェクトの情報（書籍名、イベント日、著者情報など）を書き換えてください。

- **[book/manuscripts/book.json](./book/manuscripts/book.json)**

編集後、以下のコマンドを実行すると、すべての関連ファイル（README、設定、目次、奥付など）に情報が同期されます。

```shell
node scripts/sync-all.mjs
```

※ビルドコマンド（`yarn start` 等）を実行した際にも自動的に同期されます。

## スケジュール

{{EVENT_DATE}} の {{EVENT_NAME}} オフラインイベントに向けたスケジュールです。

| 日付 | 作業内容 |
| :--- | :--- |
| {{DUE_DATE_MANUSCRIPT}} | **原稿締切** |
| {{DUE_DATE_PAGE_CONFIRM}} | ページ数確定、表紙印刷データの背表紙調整 |
| {{DUE_DATE_COVER}} | 表紙締切（入稿データの背表紙調整含む） |
| {{DUE_DATE_SUBMISSION}} | **入稿**（オフセット印刷 40% OFF） |
| {{EVENT_DATE}} | **{{EVENT_NAME}} オフラインイベント当日** |

印刷は [{{PRINTER_NAME}}]({{PRINTER_URL}}) を予定しています。
バッファを持たせていますが、締め切りまでに原稿を提出してください。

## 寄稿方法

1. **Issueへの投稿**: 原稿を書き始めたら、 [Issue]({{REPOSITORY_URL}}/issues) に概要を投稿してください。テンプレートを用意していますので、執筆予定の章のタイトルなどを記入してください。
2. **プッシュ**: 原稿が書けたら、 [本リポジトリ]({{REPOSITORY_URL}}) にブランチを切ってプッシュしてください。
3. **執筆マニュアル**: 具体的な執筆・入稿フローは [こちらの執筆マニュアル](./docs/manual.md) で説明しています。不明点があればこちらをご確認ください。

## 注意事項

- **謝礼について**: 執筆者に謝礼をお支払いすることはできません。あらかじめご了承ください。
- **献本**: 執筆に参加してくださった方には、完成した本を1冊無料でお渡しします（遠方の方には郵送も可能です）。
- **打ち上げ**: 売上状況に応じて打ち上げを検討しています。赤字の場合は実費での割り勘開催となります。
- **引用ルール**: 画像や文章を引用する際は、引用元を明示し、出典と引用の範囲が明確になるよう注意してください。
- **販売価格**: 1冊500円〜1,000円程度で検討中です（印刷費等を考慮し決定します）。

---

## PDF の生成方法（開発者向け）

```shell
make run
```

🔖 [グローバル環境を可能な限り汚染せずに Markdown から組版の PDF を生成](https://zenn.dev/yumemi_inc/articles/afe7745cd62af2)

### 電子版 PDF に表紙画像を追加する

表紙画像を `book/cover/cover.png` に保存している場合、次のコマンドで表紙結合済み PDF（`output/ebook_covered.pdf`）を生成できます。

```shell
make cover
```

### 印刷用 PDF の作成

```shell
make pdf_press
```

### 自動ページ数通知

GitHub Actions により、原稿が更新されるたびに PDF ページ数を計測し、Discord へ通知する機能が設定されています。
利用するには、GitHub リポジトリの Settings > Secrets and variables > Actions に `DISCORD_WEBHOOK_URL` を登録してください。

### 進捗状況の確認

プロジェクトの各種進捗状況は、GitHub Actions により自動的に更新されます。

- **[相互レビュー（査読）進捗](./docs/review_status.md)**: Issue の作成やコメントなどのアクションがあった際に自動更新されます。
- **[執筆宣言・未登録者リスト](./docs/proposal_status.md)**: 新たな執筆宣言があった際や、`book.json` が更新された際に自動更新されます。

## 原稿の追加方法

- `book/manuscripts` ディレクトリに `.md` ファイルを作成します。
- **[book/manuscripts/book.json](./book/manuscripts/book.json)** に記事のタイトルとファイル名を追記してください。自動的に目次やPDFの構成に反映されます。

## 文章校正 (textlint)

```shell
make lint
```
詳細はリポジトリ内の設定ファイルをご確認ください。

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

### 注意事項

- 本リポジトリの MIT ライセンスには、{{BOOK_AUTHOR}}に関する紹介文や固有のコンテンツは含まれません。
