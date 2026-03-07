"""
LLM Module - Amazon Bedrock Integration
Supports Claude and other foundation models via AWS Bedrock with Bearer Token authentication.
"""
from typing import AsyncGenerator
import boto3
import json
import os
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Bedrock client (cached)
_bedrock_client = None

VALID_BEDROCK_FORMAT = {"pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"}

def get_bedrock_client():
    """Get or create Bedrock runtime client with bearer token authentication."""
    global _bedrock_client
    if _bedrock_client is None:
        try:
            # Get bearer token from config
            bearer_token = settings.AWS_BEARER_TOKEN_BEDROCK
            
            if not bearer_token:
                logger.error("AWS_BEARER_TOKEN_BEDROCK is not set")
                return None
            
            # Create Bedrock client with empty credentials
            # The bearer token will be added via event handler
            _bedrock_client = boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_REGION,
                aws_access_key_id="",
                aws_secret_access_key="",
            )
            
            # Register event handler to inject bearer token
            def inject_bearer_token(event_name=None, **kwargs):
                """Inject bearer token into request headers."""
                if 'request' in kwargs:
                    request = kwargs['request']
                    # Remove SigV4 auth if present
                    if 'Authorization' in request.headers:
                        del request.headers['Authorization']
                    # Add bearer token
                    request.headers['Authorization'] = f'Bearer {bearer_token}'
            
            # Register for the before-send event
            _bedrock_client.meta.events.register('before-send', inject_bearer_token)
            
        except Exception as e:
            logger.error(f"Failed to create Bedrock client: {str(e)}")
            return None
    
    return _bedrock_client

async def generate_response(
    prompt: str,
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 1024,
    file_name: str | None = None,
    file_bytes: bytes | None = None,

) -> str:
    """
    Generate response using Amazon Bedrock's Claude model.
    
    Args:
        prompt: User prompt
        system_prompt: System instructions
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated response text
    """
    try:
        client = get_bedrock_client()
        if client is None:
            return "Bedrock client is not initialized. Check your bearer token configuration."
            
        model_id = settings.INFERENCE_PROFILE_ARN
        
        if not model_id:
            return "INFERENCE_PROFILE_ARN is not configured."
        
        # Construct messages with optional system prompt
        messages = []
        if system_prompt:
            messages.append({
                "role": "user",
                "content": [{"text": system_prompt}]
            })
        if(file_bytes is not None or file_name is not None):
            file_ext: str = file_name.split(".")[-1].lower() # type: ignore
            if("." not in file_name and file_ext not in VALID_BEDROCK_FORMAT): # type: ignore
                return "Invalid file type"
            
            messages.append({
                "role": "user",
                "content": [
                    {
                        "document": {
                            "name": "upload-file",
                            "format": file_ext,
                            "source":{
                                "bytes": file_bytes,
                            }
                        }
                    },
                    {"text":prompt}
                ]
            })
        else:
             messages.append({
                "role": "user",
                "content": [
                    {"text":prompt}
                ]
            })
        
        # Prepare request for Claude (Anthropic Bedrock)
        request_body = {
            "messages": messages,
            "inferenceConfig": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
            }
        }
        
        # Add system prompt to request if provided (Claude's native system parameter)
        if system_prompt:
            # request_body["system"] = system_prompt
            # Remove duplicate system from messages
            request_body["messages"] = [{
                "role": "user",
                "content": [{"text": prompt}]
            }]
        
        # Invoke the model
        response = client.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response["body"].read())
        # print(response_body["output"]["message"]["content"][0]["text"])
        
        # Extract text from response
        if "output" in response_body and len(response_body["output"]["message"]["content"]) > 0:
            return response_body["output"]["message"]["content"][0]["text"]
        else:
            logger.warning("Unexpected response format from Bedrock")
            return ""
            
    except Exception as e:
        logger.error(f"Bedrock generation failed: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        
        # Check if it's an access/auth error
        if "ValidationException" in str(e) or "AccessDeniedException" in str(e):
            return f"Something went wrong, please try again later {e}."
        
        # Check if it's a connection error
        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            return "I apologize, but I cannot connect to the AI service right now. Please try again later."
        
        # Otherwise generic error
        return f"I encountered an error while processing your request: {str(e)[:100]}"

async def generate_stream(
    prompt: str,
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 1024
) -> AsyncGenerator[str, None]:
    """
    Stream response from Amazon Bedrock's Claude model.
    
    Args:
        prompt: User prompt
        system_prompt: System instructions
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        
    Yields:
        Text chunks as they are generated
    """
    try:
        client = get_bedrock_client()
        if client is None:
            yield "Error: Bedrock client is not initialized"
            return
            
        model_id = settings.INFERENCE_PROFILE_ARN
        if not model_id:
            yield "Error: INFERENCE_PROFILE_ARN is not configured"
            return
        
        # Construct messages
        messages = [{
            "role": "user",
            "content": [{"text": prompt}]
        }]
        
        # Prepare request
        request_body = {
            "messages": messages,
            "inferenceConfig": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
            }
        }
        
        # Add system prompt if provided
        if system_prompt:
            request_body["system"] = system_prompt
        
        # Use invoke_model_with_response_stream for streaming
        response = client.invoke_model_with_response_stream(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )
        
        # Stream the response
        for event in response.get("body"):
            if "chunk" in event:
                chunk = json.loads(event["chunk"]["bytes"])
                
                if chunk.get("type") == "content_block_delta":
                    if "delta" in chunk and "text" in chunk["delta"]:
                        yield chunk["delta"]["text"]
            
    except Exception as e:
        logger.error(f"Bedrock streaming failed: {str(e)}")
        yield f"Error: {str(e)}"

def check_bedrock_health() -> bool:
    """Check if Bedrock is accessible and model is available."""
    try:
        client = get_bedrock_client()
        
        if client is None:
            logger.warning("Bedrock client is not initialized")
            return False
        
        model_id = settings.INFERENCE_PROFILE_ARN
        
        if not model_id:
            logger.warning("INFERENCE_PROFILE_ARN is not set")
            return False
        
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": "test"}]
                }
            ],
            "inferenceConfig": {
                "max_new_tokens": 10,
                "temperature": 0.1
            }
        }
        response = client.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )
        
        # Check if response was successful
        return response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 200
        
    except Exception as e:
        logger.warning(f"Bedrock health check failed: {str(e)}")
        logger.debug(f"Exception type: {type(e).__name__}")
        return False
