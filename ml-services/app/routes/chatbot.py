from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.gemini_api import call_gemini
from app.services.embed import embed_text
from app.services.faiss_service import get_store
from app.services.web_scraper import scrape_website_features
from app.services.report_service import get_user_latest_report, extract_report_summary
from app.services.context_aggregator import create_aggregator
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["premium-chatbot"])


class ChatQuery(BaseModel):
    query: str
    user_id: str
    user_profile: dict  # User health profile
    context: Optional[str] = None
    website_url: Optional[str] = None  # URL to scan for additional context


class Source(BaseModel):
    title: str
    url: str
    relevance: float  # 0-1


class ChatResponse(BaseModel):
    response: str
    sources: List[Source]
    query_id: str
    confidence: float  # 0-1
    diet_plan: Optional[List[str]] = None
    used_api: Optional[bool] = False
    model: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/query", response_model=ChatResponse)
async def process_chat_query(chat_query: ChatQuery):
    """
    Process user query through enhanced RAG pipeline with website and report analysis.
    
    This endpoint implements a comprehensive health advisory system:
    1. Fetch user's latest medical report
    2. Scrape and extract features from provided website (if any)
    3. Retrieve relevant documents from knowledge base
    4. Aggregate all context (profile, report, website, documents)
    5. Generate personalized response with LLM
    
    Args:
        chat_query: User query with health profile, optional website URL and context
    
    Returns:
        ChatResponse with AI-generated advice, sources, confidence, and diet plan
    """
    import hashlib
    
    if not chat_query.query or not chat_query.user_id:
        raise HTTPException(status_code=400, detail="Missing query or user_id")
    
    # Generate deterministic query ID
    key = (chat_query.query + chat_query.user_id).encode('utf-8')
    query_id = hashlib.md5(key).hexdigest()
    
    logger.info(f"Processing query {query_id} for user {chat_query.user_id}")
    
    # ========== STEP 1: Fetch user's latest report ==========
    user_report = None
    try:
        user_report = get_user_latest_report(chat_query.user_id)
        if user_report:
            logger.info(f"Successfully retrieved report for user {chat_query.user_id}")
    except Exception as e:
        logger.warning(f"Failed to fetch user report: {e}")
    
    # ========== STEP 2: Scrape and extract website features ==========
    website_features = None
    if chat_query.website_url:
        try:
            logger.info(f"Scraping website: {chat_query.website_url}")
            website_features = scrape_website_features(chat_query.website_url, extract_features=True)
            logger.info(f"Successfully scraped website features")
        except Exception as e:
            logger.error(f"Failed to scrape website {chat_query.website_url}: {e}")
    
    # ========== STEP 3: Retrieve relevant documents from knowledge base ==========
    retrieved_docs = []
    try:
        store = get_store()
        q_emb = embed_text(chat_query.query)
        retrieved_docs = store.search(q_emb, k=4)
        logger.info(f"Retrieved {len(retrieved_docs)} documents from knowledge base")
    except Exception as e:
        logger.warning(f"Failed to retrieve documents: {e}")
    
    # ========== STEP 4: Aggregate all context ==========
    aggregator = create_aggregator()
    # Determine whether the user's query is related to a medical report
    include_report = aggregator.is_report_related_query(chat_query.query)
    if user_report and not include_report:
        logger.info(f"Report available for user {chat_query.user_id}, but query is not report-related; skipping report in context")

    aggregated_context = aggregator.aggregate_context(
        user_query=chat_query.query,
        user_profile=chat_query.user_profile,
        user_report=user_report,
        website_features=website_features,
        retrieved_docs=retrieved_docs,
        conversation_context=chat_query.context
        , include_report=include_report
    )
    
    # ========== STEP 5: Build optimized prompts ==========
    system_prompt = aggregator.build_system_prompt(include_diet_plan=True)
    user_prompt = aggregator.build_user_prompt(chat_query.query, aggregated_context)
    
    prompt_ctx = {
        'system': system_prompt,
        'user': user_prompt
    }
    
    logger.debug(f"Built prompt context: {len(system_prompt)} chars system, {len(user_prompt)} chars user")
    
    # ========== STEP 6: Call LLM or fallback ==========
    try:
        logger.info("Calling LLM for response generation")
        llm_response = call_gemini(prompt_ctx)
        
        # Extract response components
        response_text = llm_response.get('summary') or llm_response.get('text') or "Unable to generate response"
        sources_list = llm_response.get('sources', [])
        
        # If no sources from LLM, create them from retrieved docs
        if not sources_list and retrieved_docs:
            sources_list = [
                {
                    'title': d.get('metadata', {}).get('source', f"Document {i+1}"),
                    'url': d.get('metadata', {}).get('url', ''),
                    'relevance': round(1.0 - d.get('score', 0.1), 2)
                }
                for i, d in enumerate(retrieved_docs[:3])
            ]
        
        confidence = float(llm_response.get('confidence', 0.75))
        diet_plan = llm_response.get('diet_plan', [])
        used_api = llm_response.get('used_api', False)
        model = llm_response.get('model', None)
        
        logger.info(f"Generated response with confidence {confidence}")
        
        return ChatResponse(
            response=response_text,
            sources=sources_list,
            query_id=query_id,
            confidence=round(confidence, 2),
            diet_plan=diet_plan,
            used_api=used_api,
            model=model
            ,metadata=aggregated_context.get('metadata')
        )
    
    except Exception as e:
        logger.error(f"Error calling LLM: {e}")
        
        # Fallback: provide a safe generic response
        fallback_response = (
            "I've reviewed your health profile and the information available. "
            "To provide personalized advice, please consult with your healthcare provider, "
            "especially given your specific health conditions. "
            "In the meantime, focusing on balanced nutrition, regular exercise, and stress management are foundational wellness practices."
        )
        
        sources_list = [
            {
                'title': d.get('metadata', {}).get('source', f"Reference {i+1}"),
                'url': d.get('metadata', {}).get('url', ''),
                'relevance': 0.7
            }
            for i, d in enumerate(retrieved_docs[:2])
        ] if retrieved_docs else []
        
        return ChatResponse(
            response=fallback_response,
            sources=sources_list,
            query_id=query_id,
            confidence=0.5,
            diet_plan=[],
            used_api=False,
            model='fallback'
            ,metadata=aggregated_context.get('metadata')
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for chatbot service."""
    return {"status": "chatbot service running"}


@router.get("/status")
async def service_status():
    """Get chatbot service status and model information."""
    from app.services.faiss_service import get_store
    store = get_store()
    return {
        "status": "running",
        "model": "not_configured",
        "vector_db": "faiss",
        "rag_enabled": bool(store.docs)
    }


@router.post('/ingest_user')
async def ingest_user_doc(payload: dict):
    """Ingest a user-provided document (e.g., processing_result) into the vector store.

    Expected payload: { user_id: str, text: str, metadata: dict }
    """
    user_id = payload.get('user_id')
    text = payload.get('text')
    metadata = payload.get('metadata', {})
    if not user_id or not text:
        raise HTTPException(status_code=400, detail='Missing user_id or text')
    # Build small doc
    doc_id = f'user_{user_id}_processing_result'
    vector = embed_text(text)
    store = get_store()
    try:
        store.add(doc_id, text, { **metadata, 'user_id': user_id }, vector)
        return { 'status': 'ok', 'id': doc_id }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

