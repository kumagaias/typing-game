# タイピングゲーム

Next.jsで作成したタイピングゲームです。  
https://kumagaias.github.io/typing-game/

## 📁 プロジェクト構造

```
typing-game/
├── frontend/          # Next.jsフロントエンド
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── infrastructure/    # インフラ設定（予定）
└── README.md
```

## 🎮 ゲームの特徴

- **ステージ選択**: 山、城、未来都市の3つのステージ
- **3ラウンド制バトル**: 各ステージで3回の対戦
- **派手なエフェクト**: 爆発、コンボ、ダメージエフェクト
- **スコアシステム**: 時間ボーナス、コンボボーナス付き
- **日本語入力対応**: 変換確定時の自動判定

## 🚀 開発・デプロイ

### ローカル開発
```bash
cd frontend
npm install
npm run dev
```

### GitHub Pagesデプロイ
1. GitHubリポジトリを作成
2. コードをプッシュ
3. Settings > Pages > Source を "GitHub Actions" に設定
4. mainブランチにプッシュすると自動デプロイ

## 🛠 技術スタック

### フロントエンド
- Next.js 14
- TypeScript
- Tailwind CSS
- GitHub Pages (静的サイトホスティング)

### インフラ（予定）
- AWS CDK / Terraform
- AWS Lambda
- DynamoDB

## 📝 ライセンス

MIT License