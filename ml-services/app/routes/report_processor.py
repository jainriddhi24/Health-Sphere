from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from app.services.ocr_service import extract_text
from app.services.fact_parser import extract_facts_and_evidence
from app.services.chunker import chunk_text
from app.services.vector_db import Indexer
from app.services.retriever import retrieve_candidates
from app.services.reranker import rerank_candidates
from app.services.prompt_builder import build_prompt, REQUIRED_FIELDS
from app.services.gemini_api import call_gemini
from app.services.verifier import verify_output
from app.services.scorer import score_output
from app.services.formatter import format_output
from app.services.meal_recommender import generate_diet_plan_from_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="", tags=["report-processor"]) 


class ProcessReportRequest(BaseModel):
    userId: Optional[str]
    filePath: str
    originalName: Optional[str]


class EvidenceSnippet(BaseModel):
    id: str
    text: str
    start: int
    end: int


class ProcessReportResponse(BaseModel):
    summary: str
    diagnosis: Optional[str] = ""
    patient_name: Optional[str] = ""
    diet_plan: List[str]
    personalized_diet_plan: Optional[Dict[str, Any]] = None  # Personalized meal recommendations
    sources: List[EvidenceSnippet]
    confidence: float
    metadata: Dict[str, Any]
    lab_values: List[Dict[str, Any]] = []  # Optional lab values for display


@router.post("/process-report", response_model=ProcessReportResponse)
async def process_report(request: ProcessReportRequest):
    try:
        # 1. OCR -> raw text
        raw_text = extract_text(request.filePath)
        # Add debug length and snippet for diagnostic metadata
        logger.debug('OCR extracted length=%s from %s', len(raw_text), request.filePath)
        logger.info('[OCR] Extracted text (first 500 chars): %s', raw_text[:500] if raw_text else 'empty')

        # 2. Chunk text and extract facts/evidence
        chunks = chunk_text(raw_text)
        facts, evidence = extract_facts_and_evidence(raw_text)
        logger.info('[Facts] Extracted facts: %s', list(facts.keys()))
        logger.info('[Evidence] Found %d evidence snippets', len(evidence))

        # Check for missing required fields - but don't fail completely, still process what we have
        missing = [f for f in REQUIRED_FIELDS if f not in facts]
        if not facts:  # Only fail if NO facts were extracted at all
            return {
                'summary': 'Could not extract medical data from report. Please ensure the report contains lab values (glucose, cholesterol, blood pressure, etc.).',
                'diet_plan': [],
                'sources': [],
                'lab_values': [],
                'confidence': 0.0,
                'metadata': {'missing_fields': missing, 'debug': {'raw_text_len': len(raw_text), 'sample': raw_text[:400] if raw_text else 'empty'}}
            }

        # 3. Index & retrieve
        indexer = Indexer()
        indexer.index_chunks(chunks)
        candidates = retrieve_candidates(indexer, chunks, facts)

        # 4. Rerank
        reranked = rerank_candidates(candidates, facts)

        # 5. Build prompt with FACTS and evidence snippets (only pass verified evidence snippets)
        # Pick top K evidence by whether their text appears in reranked snippets
        top_ids = {c['id'] for c in reranked[:12]}
        top_evidence = [e for e in evidence if any(e['text'] in c['snippet'] or c['id'] == e.get('id') for c in reranked)]
        
        # Allow processing even with partial data - don't fail if some fields are missing
        prompt = build_prompt(facts, top_evidence)

        # 6. Call Gemini (placeholder)
        try:
            logger.debug('Calling Gemini with prompt keys: %s', list(prompt.keys()))
            model_output = call_gemini(prompt)
        except Exception as gerr:
            # Log details and re-raise to be handled by the outer exception handler
            logger.exception('Gemini API call failed: %s', str(gerr))
            raise

        # 7. Verify and score using the evidence passed into the prompt
        verified, issues = verify_output(model_output, facts, top_evidence)
        score = score_output(model_output, verified, issues)

        # Log verification issues but don't fail - return the output anyway
        # (Users should see the AI summary even if it has minor verification issues)
        if issues:
            logger.warning('Verification issues detected (non-fatal): %s', issues)

        # 8. Format output
        formatted = format_output(model_output, top_evidence, facts)

        # Return top evidence snippets as 'sources' in the response (format for API consumers)
        sources = [
            {'id': e.get('id', ''), 'text': e.get('text', ''), 'start': e.get('start', 0), 'end': e.get('end', 0)} for e in top_evidence
        ]
        
        # Convert extracted facts to a formatted table for display
        lab_values = []
        for field, value in facts.items():
            # Format field name from snake_case to readable format
            readable_name = field.replace('_', ' ').title()
            # Add appropriate units
            units = {
                'fasting_glucose': 'mg/dL',
                'hba1c': '%',
                'total_cholesterol': 'mg/dL',
                'ldl': 'mg/dL',
                'hdl': 'mg/dL',
                'triglycerides': 'mg/dL',
                'systolic_bp': 'mmHg',
                'diastolic_bp': 'mmHg',
                'bmi': 'kg/m²',
                'hemoglobin': 'g/dL'
            }
            unit = units.get(field, '')
            lab_values.append({
                'parameter': readable_name,
                'value': value,
                'unit': unit,
                'field': field
            })
        
        # Generate personalized diet plan based on detected conditions
        personalized_diet_plan = generate_diet_plan_from_report({
            "summary": formatted['summary'],
            "metadata": {"issues": issues, "extracted_fields": list(facts.keys())},
            "lab_values": lab_values
        })
        
        return {
            "summary": formatted['summary'],
            "diagnosis": formatted.get('diagnosis', ''),
            "patient_name": facts.get('patient_name', ''),
            "diet_plan": formatted['diet_plan'],
            "personalized_diet_plan": personalized_diet_plan,
            "sources": sources,
            "confidence": score,
            "lab_values": lab_values,  # Add extracted lab values for table display
            "metadata": {"issues": issues, "extracted_fields": list(facts.keys())}
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback, os
        error_msg = f"{type(e).__name__}: {str(e)}"
        tb = traceback.format_exc()
        # Log detailed stack trace server-side
        logger.exception('Error processing report: %s', error_msg)
        # In development include the stack trace in the response; avoid leaking stack in production
        if os.environ.get('DEBUG') or os.environ.get('ENV') == 'development':
            raise HTTPException(status_code=500, detail={"error": error_msg, "type": type(e).__name__, "traceback": tb})
        else:
            raise HTTPException(status_code=500, detail={"error": error_msg, "type": type(e).__name__})
