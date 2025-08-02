# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-lambda-role-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Policy for Lambda
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          var.scores_table_arn,
          "${var.scores_table_arn}/*",
          var.leaderboard_table_arn,
          "${var.leaderboard_table_arn}/*"
        ]
      }
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api-${var.environment}"
  role         = aws_iam_role.lambda_role.arn
  
  # Container image configuration
  package_type = "Image"
  image_uri    = "${var.ecr_repository_url}:latest"
  
  # Override the entrypoint for Lambda
  image_config {
    entry_point = ["/app/main"]
    command     = []
  }
  
  # Ignore changes to image_uri to allow updates via AWS CLI
  lifecycle {
    ignore_changes = [image_uri]
  }
  
  timeout = 30
  memory_size = 512
  architectures = ["arm64"]

  environment {
    variables = {
      SCORES_TABLE_NAME      = var.scores_table_name
      LEADERBOARD_TABLE_NAME = var.leaderboard_table_name
      ENVIRONMENT           = var.environment
    }
  }

  tags = {
    Name        = "${var.project_name}-api-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 14

  tags = {
    Name        = "${var.project_name}-lambda-logs-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}
