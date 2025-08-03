# デプロイメント設定ガイド

このドキュメントでは、タイピングゲームのフロントエンドとバックエンドのデプロイメント設定について説明します。

## GitHub Environment設定

### 1. Production Environment の作成

1. GitHubリポジトリの **Settings** → **Environments** に移動
2. **New environment** をクリック
3. 環境名に `production` を入力
4. **Configure environment** をクリック

### 2. Environment Variables の設定

`production` 環境に以下の変数を設定してください：

#### フロントエンド用変数
| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_API_URL` | APIのベースURL | `https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/production` |

#### バックエンド用変数
| 変数名 | 説明 | 例 |
|--------|------|-----|
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `AWS_ROLE_ARN` | GitHub ActionsがAssumeするIAMロールのARN | `arn:aws:iam::123456789012:role/GitHubActionsRole` |
| `ECR_REPOSITORY_NAME` | ECRリポジトリ名 | `typing-game-backend` |
| `LAMBDA_FUNCTION_NAME` | Lambda関数名 | `typing-game-production-lambda` |
| `API_GATEWAY_URL` | API GatewayのURL（ヘルスチェック用） | `https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/production` |

## AWS設定

### 1. IAMロールの作成

GitHub ActionsがAWSリソースにアクセスするためのIAMロールを作成します。

#### 信頼関係ポリシー
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:*"
        }
      }
    }
  ]
}
```

#### 権限ポリシー
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:*:*:function:typing-game-*"
    }
  ]
}
```

### 2. OIDC プロバイダーの設定

GitHub ActionsがAWSにアクセスするためのOIDCプロバイダーを設定します。

1. AWS IAMコンソールで **Identity providers** に移動
2. **Add provider** をクリック
3. 以下の設定を入力：
   - **Provider type**: OpenID Connect
   - **Provider URL**: `https://token.actions.githubusercontent.com`
   - **Audience**: `sts.amazonaws.com`

## デプロイメントワークフロー

### フロントエンドデプロイ
- **トリガー**: `frontend/` ディレクトリの変更
- **デプロイ先**: GitHub Pages
- **ワークフロー**: `.github/workflows/deploy_frontend.yml`

### バックエンドデプロイ
- **トリガー**: `backend/` または `infrastructure/` ディレクトリの変更
- **デプロイ先**: AWS Lambda (ECR経由)
- **ワークフロー**: `.github/workflows/deploy_backend.yml`

## 手動デプロイ

### バックエンドの手動デプロイ
1. GitHubリポジトリの **Actions** タブに移動
2. **Deploy Backend to AWS** ワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択して **Run workflow** を実行

## トラブルシューティング

### よくある問題

1. **AWS認証エラー**
   - IAMロールのARNが正しく設定されているか確認
   - 信頼関係ポリシーのリポジトリ名が正しいか確認

2. **ECRプッシュエラー**
   - ECRリポジトリが存在するか確認
   - IAMロールにECR権限があるか確認

3. **Lambda更新エラー**
   - Lambda関数名が正しいか確認
   - IAMロールにLambda権限があるか確認

### ログの確認方法
1. GitHubリポジトリの **Actions** タブでワークフロー実行を確認
2. 失敗したジョブをクリックして詳細ログを確認
3. AWSコンソールでLambda関数のログを確認（CloudWatch Logs）

## セキュリティ

- すべてのワークフローでGitleaksによるシークレットスキャンを実行
- AWS認証情報はGitHub Secretsではなく、IAMロールとOIDCを使用
- 最小権限の原則に従ってIAM権限を設定

## 参考リンク

- [GitHub Actions でのAWS認証](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS Lambda コンテナイメージ](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Amazon ECR ユーザーガイド](https://docs.aws.amazon.com/ecr/latest/userguide/what-is-ecr.html)