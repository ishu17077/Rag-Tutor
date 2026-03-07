"""
RAG Chain Module - Complete Retrieval-Augmented Generation Pipeline
"""
import io
from typing import List, Dict, Tuple, Optional
from fastapi import UploadFile

import re
from app.ai.vector_store import get_vector_store
from app.ai.llm import generate_response
from app.ai.prompts import (
    SOCRATIC_TUTOR_SYSTEM_PROMPT,
    TOPIC_EXTRACTION_PROMPT,
    OUT_OF_SCOPE_RESPONSE
)


async def rag_query(
    subject_id: int,
    subject_name: str,
    question: str,
    initial_pdf_path: str | None,
    file_name: str | None = None,
    file_bytes: bytes | None = None,
    top_k: int = 5,
    relevance_threshold: float = 1.5
) -> Tuple[str, List[str], bool]:
    """
    Complete RAG pipeline: Retrieve -> Augment -> Generate.
    
    Args:
        subject_id: Subject ID for vector store lookup
        subject_name: Name of the subject for prompts
        question: Student's question
        top_k: Number of chunks to retrieve
        relevance_threshold: Maximum distance for relevant results
        
    Returns:
        Tuple of (answer, citations, is_in_scope)
    """
    # 1. Retrieve relevant chunks
    try:
        vector_store = get_vector_store(subject_id)
        results = vector_store.search(question, k=top_k)
    except Exception:
        results = []
    
    # Check if we have valid results
    has_relevant_content = False
    
    if results:
        # Filter by relevance (lower distance = more relevant)
        relevant_results = [r for r in results if r["score"] < relevance_threshold]
        if relevant_results:
            has_relevant_content = True
            
    # DECISION: If we have relevant content, use RAG. If not, use General Tutor Mode.
    
    # if has_relevant_content:
        # --- RAG MODE ---
    context_parts = []
    citations = []
    
    for r in relevant_results: # type: ignore
        source = r.get("source", "Course Material")
        page = r.get("page", "")
        citation = f"{source}" + (f", Page {page}" if page else "")
        
        context_parts.append(f"[From {citation}]\n{r['text']}")
        if citation not in citations:
            citations.append(citation)
    
    context = "\n\n---\n\n".join(context_parts)
    
    full_prompt = SOCRATIC_TUTOR_SYSTEM_PROMPT.format(
        subject_name=subject_name,
        retrieved_chunks=context,
        question=question
    )
    
    answer = await generate_response(
        prompt=full_prompt,
        initial_pdf_path=initial_pdf_path,
        system_prompt="You are a helpful academic tutor.",
        file_name=file_name,
        file_bytes=file_bytes,
        temperature=0.7
    )
        
    return (answer, citations, True)
    # else:
    #     # --- GENERAL MODE ---
    #     # Fallback to general knowledge if no specific content is found
    #     from app.ai.prompts import GENERAL_TUTOR_SYSTEM_PROMPT
        
    #     full_prompt = GENERAL_TUTOR_SYSTEM_PROMPT.format(
    #         subject_name=subject_name,
    #         question=question
    #     )
        
    #     answer = await generate_response(
    #         prompt=full_prompt,
    #         initial_pdf_path= initial_pdf_path,
    #         system_prompt="You are a helpful academic tutor.",
    #         file_name=file_name,
    #         file_bytes=file_bytes,
    #         temperature=0.7
    #     )
        
    #     return (answer, [], True)  # We return True for is_in_scope because we are answering it generally


async def extract_topic(question: str) -> Optional[str]:
    """
    Extract topic from a question for weak topic tracking.
    
    Args:
        question: Student's question
        
    Returns:
        Extracted topic or None
    """
    prompt = TOPIC_EXTRACTION_PROMPT.format(question=question)
    
    topic = await generate_response(
        prompt=prompt,
        initial_pdf_path = None,
        temperature=0.3,
        max_tokens=20
    )
    
    # Clean up response
    topic = topic.strip().replace('"', '').replace("'", "")
    
    # Limit length
    if len(topic) > 100:
        topic = topic[:100]
    
    return topic if topic else None


def format_citations(citations: List[str]) -> str:
    """Format citations for display."""
    if not citations:
        return ""
    
    formatted = "\n\n📚 **Sources:**\n"
    for i, citation in enumerate(citations, 1):
        formatted += f"{i}. {citation}\n"
    
    return formatted
