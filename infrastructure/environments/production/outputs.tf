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
