# 🎯 タイピングゲーム

敵とのバトル形式で楽しめるタイピングゲームです。5体の敵を倒してスコアを競おう！

🎮 **[ゲームをプレイする](https://kumagaias.github.io/typing-game/)**

![ゲーム画面](https://img.shields.io/badge/Status-Live-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Go](https://img.shields.io/badge/Go-1.21-blue) ![AWS](https://img.shields.io/badge/AWS-Lambda-orange)

## 📁 プロジェクト構造

```
typing-game/
├── frontend/          # Next.jsフロントエンド
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── backend/           # Go APIサーバー
│   ├── main.go
│   ├── Dockerfile
│   └── ...
├── infrastructure/    # Terraformインフラ設定
│   ├── environments/
│   ├── modules/
│   └── README.md
└── README.md
```

## 🎮 ゲームの特徴

### 🏆 バトルシステム
- **5ラウンド制バトル**: 初級の鬼 → 野獣の狼 → 古龍 → 雷神 → 星の支配者
- **動的HPバー**: 敵の強さに応じてHPバーの長さが変化
- **時間制限**: ラウンドが進むにつれて制限時間が短縮（50秒→30秒）
- **HP回復システム**: ラウンドクリア時に+20回復

### ⚡ ゲームプレイ
- **3段階スコアエフェクト**: 獲得スコアに応じて色とサイズが変化
- **特殊単語システム**: 
  - 🌟 **ボーナス単語**: 大ダメージ + HP回復 + 時間ボーナス
  - 💀 **デバフ単語**: 小ダメージ + 時間ペナルティ
- **コンボシステム**: 連続正解でダメージアップ（最大3倍）
- **敗北時アイコン変化**: 敵・プレイヤーの敗北を視覚的に表現

### 🏅 スコア・ランキング
- **オンラインスコア送信**: 勝利・敗北問わずスコア記録可能
- **30位リーダーボード**: 
  - 1-10位: 豪華な表示（ランクバッジ、詳細情報）
  - 11-30位: 簡素な表示（コンパクトレイアウト）
- **日本語プレイヤー名対応**: UTF-8文字を正しく処理
- **リアルタイム更新**: 最新のランキングを即座に確認

## 🚀 デプロイ方法

### 🔄 自動デプロイ（推奨）

GitHub Actionsによる自動デプロイが設定されています：

- **フロントエンド**: `frontend/` ディレクトリの変更で自動デプロイ → GitHub Pages
- **バックエンド**: `backend/` または `infrastructure/` ディレクトリの変更で自動デプロイ → AWS Lambda

#### 🛡️ セキュリティチェック付きデプロイ
- Gitleaks（秘密情報検出）
- コード品質チェック
- 脆弱性スキャン
- セキュリティチェック通過後のみデプロイ実行

詳細な設定方法は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### 📋 手動デプロイ

### 📋 前提条件

- AWS CLI設定済み
- Docker インストール済み
- Terraform >= 1.0
- Node.js >= 18

### 🏗️ インフラストラクチャ（AWS）

#### 1. S3バケット作成（初回のみ）

Terraform stateファイル保存用のS3バケットを作成：

```bash
# S3バケットの作成
aws s3 mb s3://typing-game-tf-state --region ap-northeast-1

# バケットのバージョニングを有効化
aws s3api put-bucket-versioning \
  --bucket typing-game-tf-state \
  --versioning-configuration Status=Enabled

# バケットの暗号化を有効化
aws s3api put-bucket-encryption \
  --bucket typing-game-tf-state \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

# パブリックアクセスをブロック
aws s3api put-public-access-block \
  --bucket typing-game-tf-state \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

#### 2. インフラデプロイ

```bash
cd infrastructure/environments/production
terraform init
terraform plan
terraform apply
```

### 🐳 バックエンド（Go + Lambda）

#### 1. ECRリポジトリURLを取得

```bash
cd infrastructure/environments/production
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
```

#### 2. Dockerイメージをビルド・プッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $ECR_REPO_URL

# Dockerイメージをビルド
cd backend
docker build -t typing-game-backend .

# イメージにタグ付け
docker tag typing-game-backend:latest $ECR_REPO_URL:latest

# ECRにプッシュ
docker push $ECR_REPO_URL:latest
```

#### 3. Lambda関数を更新

```bash
# Lambda関数を最新のイメージで更新
LAMBDA_FUNCTION_NAME=$(terraform output -raw lambda_function_name)
aws lambda update-function-code \
  --function-name $LAMBDA_FUNCTION_NAME \
  --image-uri $ECR_REPO_URL:latest
```

### 🌐 フロントエンド（Next.js + GitHub Pages）

#### GitHub Actions自動デプロイ

1. **リポジトリ設定**
   - Settings > Pages > Source を "GitHub Actions" に設定

2. **環境変数設定**
   ```bash
   # API Gateway URLを取得
   cd infrastructure/environments/production
   API_GATEWAY_URL=$(terraform output -raw api_gateway_url)
   
   # frontend/.env.local に設定
   echo "NEXT_PUBLIC_API_URL=$API_GATEWAY_URL" > frontend/.env.local
   ```

3. **デプロイ**
   ```bash
   git add .
   git commit -m "Deploy frontend"
   git push origin main
   ```

#### ローカル開発

```bash
cd frontend
npm install
npm run dev
```

## 🔒 セキュリティ

### GitHub Actions セキュリティチェック

このプロジェクトには3つのセキュリティワークフローが設定されています：

1. **security-check.yml** - 包括的なセキュリティスキャン
   - Gitleaks（秘密情報検出）
   - Semgrep（コードセキュリティ分析）
   - Trivy（脆弱性スキャン）
   - カスタムチェック

2. **security-light.yml** - 軽量セキュリティチェック（PR用）
   - 基本的な秘密情報検出
   - Terraform設定検証
   - パッケージ脆弱性チェック

3. **deploy.yml** - デプロイ前セキュリティチェック
   - セキュリティチェック通過後のみデプロイ実行

### ローカルセキュリティチェック

```bash
# Gitleaksでスキャン
brew install gitleaks
gitleaks detect --source . --verbose

# パッケージ脆弱性チェック
cd frontend && npm audit
```

### 🚀 一括デプロイスクリプト

便利なデプロイスクリプトも用意されています：

```bash
# 全体を一括デプロイ
./deploy.sh

# リセットして最初からデプロイ
./reset-and-deploy.sh
```

### 🧪 動作確認

```bash
# API Gateway URLを取得
cd infrastructure/environments/production
API_GATEWAY_URL=$(terraform output -raw api_gateway_url)

# Health check
curl $API_GATEWAY_URL/api/health

# スコア投稿テスト
curl -X POST $API_GATEWAY_URL/api/game/score \
  -H "Content-Type: application/json" \
  -d '{"player_name":"TestPlayer","score":10000,"round":3,"time":180}'

# リーダーボード取得
curl $API_GATEWAY_URL/api/game/leaderboard
```

## 🛠 技術スタック

### フロントエンド
- **Next.js 14**: Reactフレームワーク
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS
- **GitHub Pages**: 静的サイトホスティング

### バックエンド
- **Go**: APIサーバー
- **Gin**: Webフレームワーク
- **AWS Lambda**: サーバーレス実行環境
- **Amazon ECR**: コンテナレジストリ

### インフラストラクチャ
- **Terraform**: Infrastructure as Code
- **Amazon DynamoDB**: NoSQLデータベース
- **API Gateway**: APIエンドポイント管理
- **CloudWatch**: ログ・監視

### アーキテクチャ

```
Frontend (Next.js)
    ↓
API Gateway
    ↓
Lambda (Go + Gin)
    ↓
DynamoDB
```

## 📝 ライセンス

MIT License
