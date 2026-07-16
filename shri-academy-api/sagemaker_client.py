import aioboto3
import os
import json
import logging
from typing import Optional

log = logging.getLogger(__name__)

DEFAULT_MENTOR_PROMPT_TEMPLATE = (
    "<|system|>\n"
    "You are Shri, a knowledgeable and warm AI mentor for Shri Academy.\n"
    "<|user|>\n"
    "User {user_id} asks: {query}\n"
    "<|assistant|>"
)

async def invoke_shri_mentor_async(query: str, user_id: str) -> Optional[str]:
    """
    Asynchronously invokes the SageMaker endpoint using aioboto3.
    Constructs a chat-like prompt and returns the generated response.
    """
    endpoint_name = os.environ.get("SAGEMAKER_ENDPOINT_NAME")
    region = os.environ.get("AWS_REGION", "us-east-1")
    
    if not endpoint_name:
        log.warning("SAGEMAKER_ENDPOINT_NAME environment variable is not set. Cannot invoke async SageMaker.")
        return None

    # Construct the prompt payload
    prompt = DEFAULT_MENTOR_PROMPT_TEMPLATE.format(user_id=user_id, query=query)

    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 1024,
            "temperature": 0.7,
            "do_sample": True,
            "return_full_text": False,
        }
    }
    
    session = aioboto3.Session()
    try:
        async with session.client("sagemaker-runtime", region_name=region) as client:
            response = await client.invoke_endpoint(
                EndpointName=endpoint_name,
                ContentType="application/json",
                Body=json.dumps(payload)
            )
            response_body = await response["Body"].read()
            body = json.loads(response_body.decode("utf-8"))
            
            if isinstance(body, list) and body:
                return body[0].get("generated_text", "").strip()
            elif isinstance(body, dict):
                return body.get("generated_text", "").strip()
            return str(body)
    except Exception as e:
        log.error(f"Error invoking SageMaker endpoint '{endpoint_name}' asynchronously: {e}")
        return None
