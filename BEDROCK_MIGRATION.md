# Ollama to Bedrock Migration Guide

## Overview

This project has been migrated from using Ollama (local LLM) to Amazon Bedrock (AWS managed service).

## Changes Made

### 1. **LLM Module** (`app/ai/llm.py`)

- **Removed**: Ollama integration and LangChain ChatOllama
- **Added**: Amazon Bedrock integration using boto3
- **New Functions**:
  - `get_bedrock_client()`: Returns cached Bedrock runtime client
  - `generate_response()`: Generate responses using Claude via Bedrock
  - `generate_stream()`: Stream responses from Bedrock models
  - `check_bedrock_health()`: Health check for Bedrock connectivity

### 2. **Configuration** (`app/config.py`)

- **Removed**: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- **Added**:
  - `AWS_REGION`: AWS region for Bedrock service
  - `BEDROCK_MODEL_ID`: Model identifier (default: Claude 3 Sonnet).
  - `AWS_BEARER_TOKEN_BEDROCK`: Bearer token for authentication

### 3. **Dependencies** (`requirements.txt`)

- **Added**: `boto3==1.34.0` and `botocore==1.34.0`
- **Removed**: No longer need Ollama client libraries

### 4. **Health Check** (`app/main.py`)

- **Updated**: `/health` endpoint now checks Bedrock instead of Ollama
- Response includes `bedrock` status instead of `ollama`

### 5. **Environment Configuration** (`.env.example`)

- Updated with Bedrock configuration parameters
- Provided model options and recommendations

## Setup Instructions

### Prerequisites

1. **AWS Account**: You need an active AWS account
2. **Bedrock Access**: Enable Bedrock in your AWS account region
3. **IAM Credentials**: Ensure your AWS credentials have Bedrock permissions

### Step 1: Enable Bedrock in AWS Console

1. Go to AWS Console → Bedrock
2. Select your desired region (default: `us-east-1`)
3. Go to "Model access" and request access to Claude models
   - Recommended: Claude 3 Sonnet (balanced cost/performance)

### Step 2: Get AWS Bearer Token

1. Go to AWS Console
2. Generate or retrieve your Bedrock Bearer Token
3. Copy the `AWS_BEARER_TOKEN_BEDROCK` value

### Step 3: Configure Environment

Update your `.env` file:

```bash
# AWS Bedrock Configuration (Bearer Token Authentication)
AWS_REGION=us-east-1
AWS_BEARER_TOKEN_BEDROCK=your_bearer_token_here
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Database and other settings (keep existing)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_tutor
DB_USER=postgres
DB_PASSWORD=your_password
# ... etc
```

### Step 4: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 5: Verify Setup

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "database": "connected",
  "bedrock": "connected",
  "ai_model": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

## Available Claude Models

| Model | ID | Use Case | Cost |
|-------|---|----------|------|
| **Claude 3 Opus** | `anthropic.claude-3-opus-20240229-v1:0` | Complex reasoning, research | Higher |
| **Claude 3 Sonnet** | `anthropic.claude-3-sonnet-20240229-v1:0` | Balanced (Recommended) | Moderate |
| **Claude 3 Haiku** | `anthropic.claude-3-haiku-20240307-v1:0` | Quick responses, low cost | Lower |
| **Claude Instant** | `anthropic.claude-instant-1-2` | Legacy option | Lowest |

## Cost Considerations

- **Per-token pricing**: Bedrock charges based on input and output tokens
- **Typical RAG Query**: ~1,500 tokens = ~$0.005-0.01 per query
- **Streaming**: Same pricing as regular invocation
- **Pricing varies by model**: Check AWS Bedrock pricing page for current rates

## API Changes

### Before (Ollama)

```python
from app.ai.llm import generate_response
response = await generate_response(prompt="Your question?")
```

### After (Bedrock)

```python
from app.ai.llm import generate_response
response = await generate_response(prompt="Your question?")
# No changes needed! Same interface
```

**Note**: The function signatures remain the same for backward compatibility.

## Improvements Over Ollama

✅ **Scalability**: No local infrastructure needed  
✅ **Reliability**: AWS managed service with SLAs  
✅ **Performance**: Optimized inference from AWS  
✅ **Model Quality**: Access to latest Claude models  
✅ **Security**: AWS IAM integration  
✅ **Streaming**: Native streaming support  

## Troubleshooting

### Issue: "ValidationException" or "AccessDeniedException"

**Solution**:

- Verify `AWS_BEARER_TOKEN_BEDROCK` is correctly set in `.env`
- Ensure the bearer token is valid and not expired
- Check bearer token has Bedrock permissions
- Ensure Bedrock is enabled in your region

### Issue: "TextureLocationError" or Connection failures

**Solution**:

- Verify `AWS_REGION` matches where Bedrock is enabled
- Check internet connectivity to AWS
- Confirm model ID exists in selected region

### Issue: High latency

**Solution**:

- First request may take longer (model loading)
- Subsequent requests should be ~1-2 seconds
- Consider using Claude 3 Haiku for faster responses

## Rollback to Ollama (if needed)

To revert to Ollama, you would need to:

1. Restore the original `llm.py` from git history
2. Revert `.env` configuration
3. Update `config.py` and `main.py`

However, staying with Bedrock is recommended for production use.

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Documentation](https://docs.anthropic.com/claude/docs/intro-to-claude)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [boto3 Bedrock Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-runtime.html)

---

**Migration Status**: ✅ Complete  
**Last Updated**: 2026-03-04
