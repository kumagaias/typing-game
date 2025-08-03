# GitHub Actions IAM Role and OIDC Provider

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# OIDC Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Name        = "${var.project_name}-github-oidc-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "GitHub Actions OIDC Provider"
  }
}

# Trust policy for GitHub Actions
data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:*"]
    }
  }
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name               = "${var.project_name}-github-actions-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  tags = {
    Name        = "${var.project_name}-github-actions-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "GitHub Actions Deployment Role"
  }
}

# Policy for ECR operations
data "aws_iam_policy_document" "ecr_policy" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeRepositories",
      "ecr:DescribeImages"
    ]
    resources = ["*"]
  }
}

# Policy for Lambda operations
data "aws_iam_policy_document" "lambda_policy" {
  statement {
    effect = "Allow"
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:GetFunction",
      "lambda:UpdateFunctionConfiguration",
      "lambda:PublishVersion",
      "lambda:CreateAlias",
      "lambda:UpdateAlias",
      "lambda:GetFunctionConfiguration"
    ]
    resources = [
      "arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-*"
    ]
  }
}

# Policy for CloudWatch Logs (for debugging)
data "aws_iam_policy_document" "logs_policy" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ]
    resources = [
      "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-*"
    ]
  }
}

# Combined policy document
data "aws_iam_policy_document" "github_actions_policy" {
  source_policy_documents = [
    data.aws_iam_policy_document.ecr_policy.json,
    data.aws_iam_policy_document.lambda_policy.json,
    data.aws_iam_policy_document.logs_policy.json
  ]
}

# IAM Policy for GitHub Actions
resource "aws_iam_policy" "github_actions" {
  name        = "${var.project_name}-github-actions-policy-${var.environment}"
  description = "Policy for GitHub Actions to deploy ${var.project_name}"
  policy      = data.aws_iam_policy_document.github_actions_policy.json

  tags = {
    Name        = "${var.project_name}-github-actions-policy-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "GitHub Actions Deployment Policy"
  }
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}