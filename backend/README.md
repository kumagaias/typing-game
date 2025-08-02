# Typing Game Backend

GoとGinフレームワークを使用したタイピングゲームのバックエンドAPI

## 機能

- スコア投稿API
- リーダーボードAPI
- AWS Lambda対応
- CORS対応

## API エンドポイント

### Health Check
```
GET /api/health
```

### スコア投稿
```
POST /api/game/score
Content-Type: application/json

{
  "player_name": "プレイヤー名",
  "score": 15000,
  "round": 5,
  "time": 300
}
```

### リーダーボード取得
```
GET /api/game/leaderboard
```

## ローカル開発

### 前提条件
- Go 1.21以上

### セットアップ
```bash
cd backend
go mod tidy
go run main.go
```

サーバーは http://localhost:8080 で起動します。

### テスト
```bash
# Health check
curl http://localhost:8080/api/health

# スコア投稿
curl -X POST http://localhost:8080/api/game/score \
  -H "Content-Type: application/json" \
  -d '{"player_name":"TestPlayer","score":10000,"round":3,"time":180}'

# リーダーボード取得
curl http://localhost:8080/api/game/leaderboard
```

## Docker

### ビルド
```bash
docker build -t typing-game-backend .
```

### 実行
```bash
docker run -p 8080:8080 typing-game-backend
```

## AWS Lambda デプロイ

このアプリケーションはAWS Lambdaで実行できるように設計されています。

### 環境変数
- `AWS_LAMBDA_RUNTIME_API`: Lambda環境で自動設定
- その他のAWS設定は環境に応じて設定

## TODO

- [ ] DynamoDB統合
- [ ] 認証機能
- [ ] バリデーション強化
- [ ] ログ改善
- [ ] テスト追加