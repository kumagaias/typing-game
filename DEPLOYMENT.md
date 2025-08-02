# Typing Game デプロイ手順

## 前提条件

- AWS CLI設定済み
- Docker インストール済み
- Terraform >= 1.0
- Go >= 1.21

## 1. インフラストラクチャのデプロイ

### Step 1: S3バケット作成（初回のみ）

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

### Step 2: Terraformでインフラ作成

```bash
cd infrastructure/environments/production
terraform init
terraform plan
terraform apply
```

## 2. バックエンドのデプロイ

### Step 1: ECRリポジトリURLを取得

```bash
# Terraformの出力からECRリポジトリURLを取得
cd infrastructure/environments/production
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
echo $ECR_REPO_URL
```

### Step 2: Dockerイメージをビルド・プッシュ

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

### Step 3: Lambda関数を更新

```bash
# Lambda関数を最新のイメージで更新
LAMBDA_FUNCTION_NAME=$(terraform output -raw lambda_function_name)
aws lambda update-function-code \
  --function-name $LAMBDA_FUNCTION_NAME \
  --image-uri $ECR_REPO_URL:latest
```

## 3. フロントエンドのデプロイ

### GitHub Pagesへのデプロイ

```bash
cd frontend
npm run build
npm run export

# GitHub Pagesにデプロイ（既存の設定を使用）
git add .
git commit -m "Deploy frontend"
git push origin main
```

## 4. 動作確認

### API Gateway URLを取得

```bash
cd infrastructure/environments/production
API_GATEWAY_URL=$(terraform output -raw api_gateway_url)
echo "API Gateway URL: $API_GATEWAY_URL"
```

### APIテスト

```bash
# Health check
curl $API_GATEWAY_URL/api/health

# スコア投稿テスト
curl -X POST $API_GATEWAY_URL/api/game/score \
  -H "Content-Type: application/json" \
  -d '{"player_name":"TestPlayer","score":10000,"round":3,"time":180}'

# リーダーボード取得
curl $API_GATEWAY_URL/api/game/leaderboard
```

## 5. 自動デプロイスクリプト

便利なデプロイスクリプトを作成：

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# 1. インフラデプロイ
echo "📦 Deploying infrastructure..."
cd infrastructure/environments/production
terraform apply -auto-approve

# 2. ECRリポジトリURL取得
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
LAMBDA_FUNCTION_NAME=$(terraform output -raw lambda_function_name)

# 3. バックエンドデプロイ
echo "🐳 Building and pushing Docker image..."
cd ../../../backend

# ECRログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $ECR_REPO_URL

# ビルド・プッシュ
docker build -t typing-game-backend .
docker tag typing-game-backend:latest $ECR_REPO_URL:latest
docker push $ECR_REPO_URL:latest

# Lambda更新
echo "⚡ Updating Lambda function..."
aws lambda update-function-code \
  --function-name $LAMBDA_FUNCTION_NAME \
  --image-uri $ECR_REPO_URL:latest

# 4. フロントエンドデプロイ
echo "🌐 Deploying frontend..."
cd ../frontend
npm run build
npm run export

echo "✅ Deployment completed!"
echo "API Gateway URL: $(cd ../infrastructure/environments/production && terraform output -raw api_gateway_url)"
```

## 6. 環境変数の設定

フロントエンドでAPI Gateway URLを使用する場合：

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.ap-northeast-1.amazonaws.com/production
```

## トラブルシューティング

### よくある問題

1. **ECRプッシュエラー**
   ```bash
   # ECRリポジトリが存在することを確認
   aws ecr describe-repositories --repository-names typing-game-production
   ```

2. **Lambda更新エラー**
   ```bash
   # Lambda関数の状態を確認
   aws lambda get-function --function-name typing-game-api-production
   ```

3. **API Gateway接続エラー**
   ```bash
   # API Gateway URLを確認
   aws apigatewayv2 get-apis
   ```

### ログの確認

```bash
# Lambda関数のログ
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/typing-game"

# API Gatewayのログ
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway/typing-game"
```