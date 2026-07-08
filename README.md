# 今週の火と土

自分管理アプリ：毎週の火（エネルギー）と土（リズム）を整えるための記録ツール

## 機能

- **日々のアンカー**: 朝日、温める、書く、静めるの4つの習慣と、リズムを毎日記録
- **週の目標**: 学び（専門）、筋トレ、サウナの進捗を追跡
- **完全オフの日**: 完全に休む日を指定
- **スコア計算**: 火と土の充足度を自動計算
- **メモ**: 今週の気づきや方針を記録
- **過去の記録**: 過去6週間の記録を表示
- **自動保存**: データはブラウザの LocalStorage に自動保存

## セットアップ

```bash
npm install
npm start
```

## ビルド

```bash
npm run build
```

## デプロイ

### Vercel へのデプロイ（推奨）

1. [Vercel](https://vercel.com) にサインアップ
2. このリポジトリを Vercel に接続
3. 自動でデプロイされます

### GitHub Pages へのデプロイ

`package.json` に以下を追加：
```json
"homepage": "https://o38kuk-netizen.github.io/selfmanagement"
```

## 技術スタック

- React 18
- React Hooks
- Lucide React (アイコン)
- LocalStorage (データ永続化)

## ブラウザ対応

モダンブラウザのすべて（Chrome、Firefox、Safari、Edge）
