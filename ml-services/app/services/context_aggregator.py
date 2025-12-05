"""
context_aggregator: Service for combining multiple context sources into coherent prompt context.

This module aggregates information from:
1. User's health profile
2. Latest uploaded medical report
3. Website features (scraped content)
4. Retrieved RAG documents
5. User's conversation context

The aggregated context is optimized for LLM consumption with clear structure and relevance.
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from . import fact_parser, prompt_builder

logger = logging.getLogger(__name__)


class ContextAggregator:
    """Aggregates multiple context sources for chatbot queries."""
    
    def __init__(self, max_context_length: int = 4000):
        """
        Initialize the context aggregator.
        
        Args:
            max_context_length: Maximum length for aggregated context (tokens)
        """
        self.max_context_length = max_context_length
    
    def aggregate_context(
        self,
        user_query: str,
        user_profile: Dict[str, Any],
        user_report: Optional[Dict[str, Any]] = None,
        website_features: Optional[Dict[str, Any]] = None,
        retrieved_docs: Optional[List[Dict[str, Any]]] = None,
        conversation_context: Optional[str] = None
        ,
        include_report: bool = True
    ) -> Dict[str, str]:
        """
        Aggregate multiple context sources into structured format for LLM.
        
        Args:
            user_query: The user's actual question/query
            user_profile: User's health profile (age, gender, conditions, etc.)
            user_report: Latest medical/health report data
            website_features: Structured features from scraped website
            retrieved_docs: Documents retrieved from vector store (RAG)
            conversation_context: Previous conversation or context
        
        Returns:
            Dictionary with organized context sections
        """
        profile_text = self._format_user_profile(user_profile)
        report_text = self._format_user_report(user_report) if include_report else None
        web_text = self._format_website_features(website_features)
        kb_text = self._format_retrieved_docs(retrieved_docs)

        # Derived metadata and checks
        missing_fields, follow_up_questions = self.check_profile_completeness(user_profile)
        facts, evidence = self.extract_report_facts(user_report)
        danger_flags = self.detect_dangerous_values(user_report, facts)
        needs_professional_review = bool(danger_flags)

        context = {
            'user_profile': profile_text,
            'user_report': report_text,
            'website_context': web_text,
            'knowledge_base': kb_text,
            'conversation_context': conversation_context or '',
            'query': user_query,
            'metadata': {
                'missing_profile_fields': missing_fields,
                'follow_up_questions': follow_up_questions,
                'report_facts': facts,
                'report_evidence': evidence,
                'danger_flags': danger_flags,
                'needs_professional_review': needs_professional_review
            }
        }
        
        return context
    
    def _format_user_profile(self, profile: Dict[str, Any]) -> str:
        """Format user health profile into readable context."""
        if not profile:
            return "User profile: Not available"
        
        parts = []
        
        # Basic info
        if 'name' in profile:
            parts.append(f"User: {profile['name']}")
        
        if 'age' in profile:
            parts.append(f"Age: {profile['age']}")
        
        if 'gender' in profile:
            parts.append(f"Gender: {profile['gender']}")
        
        # Health metrics
        if 'height' in profile and 'weight' in profile:
            parts.append(f"Height: {profile['height']}cm, Weight: {profile['weight']}kg")
        
        if 'chronic_condition' in profile:
            parts.append(f"Chronic Condition: {profile['chronic_condition']}")
        
        if 'personal_goals' in profile and profile['personal_goals']:
            goals = ', '.join(profile['personal_goals'])
            parts.append(f"Goals: {goals}")
        
        if 'lifestyle' in profile:
            parts.append(f"Lifestyle: {profile['lifestyle']}")
        
        if not parts:
            return "User profile: Available"
        
        return "User Health Profile:\n" + "\n".join(parts)

    def check_profile_completeness(self, profile: Optional[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
        """Check for required profile fields and return missing fields and suggested follow-up questions.

        This helps keep the assistant from making assumptions.
        """
        required = ['age', 'gender', 'height', 'weight', 'allergies', 'medications', 'chronic_conditions', 'lifestyle']
        missing = []
        follow_up_questions = []
        if not profile:
            # Request all fields if profile is missing
            for f in required:
                missing.append(f)
                follow_up_questions.append(self._default_follow_up_for_field(f))
            return missing, follow_up_questions

        for f in required:
            if not profile.get(f) and profile.get(f) != 0:
                missing.append(f)
                follow_up_questions.append(self._default_follow_up_for_field(f))

        return missing, follow_up_questions

    def _default_follow_up_for_field(self, field: str) -> str:
        """Return a simple follow-up question for a missing profile field."""
        qmap = {
            'age': 'Could you please provide your age or birth year?',
            'gender': 'Please confirm your gender (male/female/other).',
            'height': 'What is your height in cm or feet/inches?',
            'weight': 'What is your current weight in kg or pounds?',
            'allergies': 'Do you have any medication or food allergies? If none, say "None".',
            'medications': 'Are you currently on any medication? Please list or say "None".',
            'chronic_conditions': 'Do you have any long-term health conditions (e.g. diabetes, hypertension)?',
            'lifestyle': 'Tell me about your activity level (sedentary, lightly active, active), smoking/alcohol use.'
        }
        return qmap.get(field, f'Please provide {field}.')
    
    def _format_user_report(self, report: Optional[Dict[str, Any]]) -> str:
        """Format user's latest medical report into context."""
        if not report:
            return "User Report: No recent report available"
        
        parts = ["User's Latest Medical Report:"]
        
        # Main processing result
        if 'processing_result' in report:
            parts.append(f"Analysis: {report['processing_result'][:500]}")
        
        # Report date
        if 'created_at' in report:
            parts.append(f"Date: {report['created_at']}")
        
        # File name
        if 'file_name' in report:
            parts.append(f"Document: {report['file_name']}")
        
        # Risk metrics
        if 'risk_metrics' in report:
            parts.append(f"Risk Factors: {report['risk_metrics']}")
        
        # Key recommendations
        if 'recommendations' in report:
            parts.append(f"Recommendations: {report['recommendations']}")
        
        return "\n".join(parts)

    def extract_report_facts(self, report: Optional[Dict[str, Any]]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """Extract numeric facts and supporting evidence from the report text using fact_parser.

        Returns a tuple (facts, evidence).
        """
        if not report:
            return {}, []

        text = report.get('processing_result') or report.get('text') or ''
        if not text:
            return {}, []

        try:
            facts, evidence = fact_parser.extract_facts_and_evidence(text)
            return facts, evidence
        except Exception as e:
            logger.exception('Error parsing facts from report: %s', e)
            return {}, []

    def detect_dangerous_values(self, report: Optional[Dict[str, Any]], facts: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check facts against any provided reference ranges in the report and return flags.

        This function only uses explicit reference ranges present in the report. It will not
        attempt to apply external clinical thresholds to avoid hallucination or incorrect
        blanket judgments.
        """
        flags = []
        if not report:
            return flags

        # If the report includes structured lab entries, check ranges
        lab_results = report.get('lab_results') or report.get('labs') or report.get('results')
        if isinstance(lab_results, list):
            for item in lab_results:
                try:
                    test_name = item.get('test_name') or item.get('name')
                    value = item.get('value')
                    ref_low = item.get('ref_range', {}).get('low') if isinstance(item.get('ref_range'), dict) else None
                    ref_high = item.get('ref_range', {}).get('high') if isinstance(item.get('ref_range'), dict) else None
                    # Accept when there is explicit low/high range
                    if value is not None and (ref_low is not None or ref_high is not None):
                        out_of_range = False
                        try:
                            val = float(value)
                            if ref_low is not None and val < float(ref_low):
                                out_of_range = True
                            if ref_high is not None and val > float(ref_high):
                                out_of_range = True
                        except Exception:
                            out_of_range = False

                        if out_of_range:
                            flags.append({
                                'test_name': test_name,
                                'value': value,
                                'ref_low': ref_low,
                                'ref_high': ref_high,
                                'evidence': item
                            })
                except Exception:
                    logger.debug('Unable to interpret lab item: %s', item)

        # Also, if we have parsed facts with explicit numeric values but no structured ref ranges,
        # we do not mark them as dangerous, but include them for the verifier/LLM to consider.
        return flags
    
    def _format_website_features(self, website_data: Optional[Dict[str, Any]]) -> str:
        """Format scraped website features into context."""
        if not website_data:
            return "Website Context: Not provided"
        
        parts = ["Website Context:"]
        
        # Check if we have structured features
        if 'structured_features' in website_data:
            features = website_data['structured_features']
            
            if features.get('title'):
                parts.append(f"Title: {features['title']}")
            
            if features.get('key_features'):
                parts.append(f"Key Features: {features['key_features']}")
            
            if features.get('content_summary'):
                parts.append(f"Summary: {features['content_summary']}")
        
        # Fallback to raw data
        elif 'raw_data' in website_data:
            urls = list(website_data['raw_data'].keys())
            if urls:
                parts.append(f"Source: {urls[0]}")
                content = website_data['raw_data'][urls[0]]
                if len(content) > 300:
                    parts.append(f"Content: {content[:300]}...")
                else:
                    parts.append(f"Content: {content}")
        
        return "\n".join(parts) if len(parts) > 1 else "Website Context: Not available"
    
    def _format_retrieved_docs(self, docs: Optional[List[Dict[str, Any]]]) -> str:
        """Format RAG-retrieved documents into context."""
        if not docs or len(docs) == 0:
            return "Knowledge Base: No relevant documents found"
        
        parts = ["Knowledge Base References:"]
        
        for i, doc in enumerate(docs[:4], 1):  # Limit to top 4
            content = doc.get('content', '')
            if len(content) > 200:
                content = content[:200] + '...'
            
            source = doc.get('metadata', {}).get('source', 'Unknown')
            parts.append(f"\n[{i}] {content}\n    Source: {source}")
        
        return "\n".join(parts)
    
    def build_system_prompt(self, include_diet_plan: bool = True) -> str:
        """
        Build an optimized system prompt for the LLM.
        
        Args:
            include_diet_plan: Whether to request diet plan in response
        
        Returns:
            System prompt string
        """
        base_prompt = """You are a knowledgeable HealthSphere platform expert and health advisor. HealthSphere is an intelligent healthcare
        and fitness ecosystem designed to support preventive wellness and help users understand their current and future health.
        When asked about the platform, always explain the platform's purpose, features, and use cases in a short, helpful format.
        Always avoid making claims beyond the platform's scope and ask for clarification if necessary.
        The assistant should provide accurate details about the platform's modules and workflows when requested by users:
        - Core purpose: HealthSphere unifies fitness, medical report summaries, nutrition, workout plans, and preventive alerts.
        - Main features: Personalized dashboards, report interpretation, diet planning using clinical values, food recognition, adaptive workouts for chronic conditions, risk forecasting, preventive alerts, mental wellness support, AI assistant, community features, cultural adaptations.
        - Unique innovations: Combines clinical reports with lifestyle data, uses RAG to reduce hallucinations, provides individualized long-term risk forecasts and personalized guidance.
        - Target users: health-conscious users, people managing diabetes, hypertension, obesity, and those seeking preventive care.
        - Limitations: Not a replacement for medical diagnosis; never infer diagnoses without data; escalate to professional review when tests indicate risk.

        Your role is to:
        1. Provide evidence-based, actionable health advice
        2. Personalize recommendations based on the user's profile and medical history
        3. Reference relevant knowledge when available
        4. Consider website features/resources when discussing treatments or wellness
        5. Always prioritize user safety and suggest consulting healthcare providers when needed
        6. Be clear about what you do and don't know

        Guidelines:
        - Use the user's profile, medical report, and retrieved knowledge to inform your answer
        - If website resources are provided, mention them when relevant
        - Be specific and practical with recommendations
        - Acknowledge limitations and uncertainties
        - Cite sources when possible"""
        # Strengthen with safety, clarifications, and anti-hallucination instructions
        base_prompt += (
            "\n- Use ONLY the patient profile, report facts, and retrieved knowledge documents included in the prompt. "
            "Do not assume or invent missing data. If important information is missing, include an explicit 'follow_up_questions' list in your response and ask the patient."
            " If you find any metrics outside the report's provided reference ranges, set 'needs_professional_review' to true and explain why with evidence IDs or field names."
        )
        
        if include_diet_plan:
            base_prompt += "\n- When appropriate, suggest a personalized diet plan based on the user's health data"
        
        return base_prompt
    
    def build_user_prompt(
        self,
        query: str,
        context: Dict[str, str],
        include_instructions: bool = True
    ) -> str:
        """
        Build a comprehensive user prompt with aggregated context.
        
        Args:
            query: The user's question
            context: Aggregated context dictionary
            include_instructions: Whether to include response format instructions
        
        Returns:
            Formatted user prompt
        """
        prompt = f"User Query: {query}\n\n"
        
        # Add each context section if available
        if context.get('user_profile'):
            prompt += f"{context['user_profile']}\n\n"
        
        if context.get('user_report'):
            prompt += f"{context['user_report']}\n\n"
        
        if context.get('website_context'):
            prompt += f"{context['website_context']}\n\n"
        
        if context.get('knowledge_base'):
            prompt += f"{context['knowledge_base']}\n\n"
        
        if context.get('conversation_context'):
            prompt += f"Previous Context: {context['conversation_context']}\n\n"
        
        # Add follow-up question metadata if provided
        metadata = context.get('metadata', {})
        missing = metadata.get('missing_profile_fields', [])
        follow_up = metadata.get('follow_up_questions', [])
        danger_flags = metadata.get('danger_flags', [])

        if missing and follow_up:
            prompt += "Follow-up Questions to Ask the User:\n"
            for q in follow_up:
                prompt += f"- {q}\n"
            prompt += "\n"

        if danger_flags:
            prompt += "Alert: Certain lab values are outside the provided reference ranges; recommend immediate professional review and include 'needs_professional_review': true.\n\n"

        if include_instructions:
            prompt += """Please provide a response in the following JSON format:
{
    "summary": "Your main response/advice",
    "diet_plan": ["Step 1", "Step 2", ...] (if applicable),
    "sources": [{"title": "Source title", "url": "url", "relevance": 0.9}],
    "confidence": 0.85 (0-1 scale),
    "needs_professional_review": true/false
}"""
        
        return prompt

    def is_report_related_query(self, query: str) -> bool:
        """
        Heuristic to determine whether a user's query is related to their medical report.

        This simple method checks for a set of keywords that indicate a user
        is asking about lab results, reports, or diagnostics. We intentionally
        keep it simple to avoid introducing heavy NLP deps.
        """
        if not query:
            return False

        q = query.lower()
        keywords = [
            'report', 'reporting', 'lab', 'labs', 'blood', 'test', 'tests', 'results', 'result',
            'lab result', 'lab results', 'bloodwork', 'blood test', 'cholesterol', 'a1c', 'hemoglobin',
            'imaging', 'x-ray', 'ct', 'mri', 'scan', 'diagnostic'
        ]

        for kw in keywords:
            if kw in q:
                return True

        # Also consider queries that explicitly ask for an explanation of recent documents
        if 'explain my' in q or 'what does my' in q or 'interpret my' in q:
            return True

        return False


def create_aggregator(max_context_length: int = 4000) -> ContextAggregator:
    """Factory function to create a context aggregator instance."""
    return ContextAggregator(max_context_length=max_context_length)
