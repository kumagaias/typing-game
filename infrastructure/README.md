# Infrastructure

タイピングゲームのインフラストラクチャ設定

## 予定している構成

- **API Gateway + Lambda**: ゲームスコア管理API
- **DynamoDB**: スコアデータ保存
- **CloudFront**: CDN配信
- **Route53**: ドメイン管理

## 開発予定

- [ ] AWS CDK設定
- [ ] スコアAPI実装
- [ ] ランキング機能
- [ ] ユーザー認証

## ディレクトリ構造

```
infrastructure/
├── cdk/              # AWS CDK設定
├── terraform/        # Terraform設定（代替案）
├── scripts/          # デプロイスクリプト
└── docs/            # インフラドキュメント
```