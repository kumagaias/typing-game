# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "Typing Game API"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "authorization"]
    allow_methods     = ["GET", "POST", "OPTIONS"]
    allow_origins     = [
      "http://localhost:3000",           # ローカル開発
      "https://typing-game.kumalabo.com" # 本番ドメイン
    ]
    expose_headers    = []
    max_age          = 300
  }

  tags = {
    Name        = "${var.project_name}-api-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# API Gateway Integration
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id = aws_apigatewayv2_api.api.id

  integration_uri    = var.lambda_invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

# API Gateway Route
resource "aws_apigatewayv2_route" "api_route" {
  api_id = aws_apigatewayv2_api.api.id

  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# API Gateway Route for root
resource "aws_apigatewayv2_route" "root_route" {
  api_id = aws_apigatewayv2_api.api.id

  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "api_stage" {
  api_id = aws_apigatewayv2_api.api.id

  name        = var.environment
  auto_deploy = true

  # レート制限設定
  default_route_settings {
    throttling_rate_limit  = 100  # 1秒あたり100リクエスト
    throttling_burst_limit = 200  # バーストで200リクエスト
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_logs.arn

    format = jsonencode({
      requestId      = "$context.requestId"
      sourceIp       = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      protocol       = "$context.protocol"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }

  tags = {
    Name        = "${var.project_name}-api-stage-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gw_logs" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = 14

  tags = {
    Name        = "${var.project_name}-api-gw-logs-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}
