output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = module.ecr.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = module.ecr.repository_arn
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = module.api_gateway.api_gateway_url
}

output "scores_table_name" {
  description = "Scores DynamoDB table name"
  value       = module.dynamodb.scores_table_name
}

output "leaderboard_table_name" {
  description = "Leaderboard DynamoDB table name"
  value       = module.dynamodb.leaderboard_table_name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda.lambda_function_name
}

output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = module.github_actions_iam.github_actions_role_arn
}

output "github_actions_role_name" {
  description = "GitHub Actions IAM role name"
  value       = module.github_actions_iam.github_actions_role_name
}

output "oidc_provider_arn" {
  description = "GitHub OIDC provider ARN"
  value       = module.github_actions_iam.oidc_provider_arn
}
