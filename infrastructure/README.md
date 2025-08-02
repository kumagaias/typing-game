# Typing Game Infrastructure

このディレクトリには、タイピングゲームのAWSインフラストラクチャをTerraformで管理するためのコードが含まれています。

## ディレクトリ構造

```
environments/
  └── production/      # 本番環境
modules/
  └── aws/
    ├── ecr/         # ECRモジュール
    ├── dynamodb/    # DynamoDBモジュール
    ├── lambda/      # Lambdaモジュール
    └── api-gateway/ # API Gatewayモジュール
```

## 初期セットアップ

### 1. AWS CLI の設定

まず、AWS CLIをインストールして設定します。

```bash
# AWS CLIのインストール（macOS）
brew install awscli

# AWS CLIのインストール（Linux/Windows）
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# AWS認証情報の設定
aws configure
```

設定時に入力する項目：
- **AWS Access Key ID**: IAMユーザーのアクセスキー
- **AWS Secret Access Key**: IAMユーザーのシークレットキー
- **Default region name**: `ap-northeast-1` (東京リージョン)
- **Default output format**: `json`

### 2. 必要なIAM権限

Terraformを実行するIAMユーザーには以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "ecr:*",
        "dynamodb:*",
        "lambda:*",
        "apigateway:*",
        "logs:*",
        "iam:ListRoles",
        "iam:PassRole",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Terraform State用S3バケットの作成

Terraformを実行する前に、tfstateファイルを保存するS3バケットを作成する必要があります。

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

## 使用方法

### 本番環境のデプロイ

```bash
cd infrastructure/environments/production
terraform init
terraform plan
terraform apply
```

## モジュール

### ECR モジュール

Amazon Elastic Container Registry (ECR) を作成します。

**機能:**
- ECRリポジトリの作成
- イメージスキャンの有効化
- ライフサイクルポリシーの設定
- リポジトリポリシーの設定

**出力:**
- `repository_url`: ECRリポジトリのURL
- `repository_arn`: ECRリポジトリのARN
- `repository_name`: ECRリポジトリ名
- `registry_id`: レジストリID

## 前提条件

- Terraform >= 1.0
- AWS CLI >= 2.0
- AWSアカウント
- 適切なIAM権限を持つAWSユーザー

## セキュリティ

- ECRリポジトリは暗号化されています
- イメージスキャンが有効化されています
- ライフサイクルポリシーで古いイメージを自動削除