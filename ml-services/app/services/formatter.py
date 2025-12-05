from typing import Dict, List, Any
import re
import json


def format_output(model_output: Dict[str, Any], evidence: List[Dict[str, Any]], facts: Dict[str, Any] = None) -> Dict[str, Any]:
    """Format the model's output into structured summary, diagnosis, and diet plan.
    
    Attempts to parse JSON response from Gemini. Falls back to plain text parsing if needed.
    If all else fails, generates a readable summary from extracted facts.
    """
    print(f'[Formatter] Starting format_output with facts keys: {list(facts.keys()) if facts else "None"}')
    text = model_output.get('text', '')
    print(f'[Formatter] Model output text length: {len(text) if text else 0} chars')
    
    # Try to parse JSON response from Gemini
    parsed_json = None
    if text and isinstance(text, str):
        try:
            # Remove markdown code blocks if present
            json_text = text
            if '```json' in json_text:
                json_text = json_text.split('```json')[1].split('```')[0]
            elif '```' in json_text:
                json_text = json_text.split('```')[1].split('```')[0]
            parsed_json = json.loads(json_text.strip())
            print(f'[Formatter] Successfully parsed JSON response with keys: {list(parsed_json.keys())}')
        except Exception as e:
            # If JSON parsing fails, try to extract fields manually
            print(f'[Formatter] Failed to parse JSON: {str(e)}')
    
    # Extract fields from JSON if parsed, otherwise fall back to defaults
    diagnosis = ""
    summary = ""
    diet_plan_items = []
    clinical_notes = ""
    
    if parsed_json:
        diagnosis = parsed_json.get('diagnosis', '') or ""
        summary = parsed_json.get('summary', '') or parsed_json.get('clinical_summary', '') or ""
        diet_plan_items = parsed_json.get('diet_plan', []) or []
        clinical_notes = parsed_json.get('clinical_notes', '') or ""
        
        # Build comprehensive summary including all details
        summary_parts = []
        if diagnosis:
            summary_parts.append(f"Medical Diagnosis:\n{diagnosis}")
        if summary:
            summary_parts.append(f"Clinical Summary:\n{summary}")
        if clinical_notes:
            summary_parts.append(f"Clinical Notes:\n{clinical_notes}")
        
        if summary_parts:
            summary = "\n\n".join(summary_parts)
        else:
            summary = text or "Unable to generate summary"
    else:
        # Fallback: Generate readable summary from facts if Gemini response failed
        if facts:
            summary_lines = []
            
            # Add patient name if available
            if 'patient_name' in facts and facts['patient_name']:
                summary_lines.append(f"Patient Report Summary\nPatient Name: {facts['patient_name']}\n")
            
            # Generate health findings summary
            findings = []
            
            # Blood Pressure
            if 'systolic_bp' in facts or 'diastolic_bp' in facts:
                systolic = facts.get('systolic_bp', 'N/A')
                diastolic = facts.get('diastolic_bp', 'N/A')
                findings.append(f"• Blood Pressure: {systolic}/{diastolic} mmHg")
            
            # Glucose
            if 'fasting_glucose' in facts:
                glucose = facts.get('fasting_glucose')
                if glucose and float(glucose) > 126:
                    findings.append(f"• Fasting Glucose: {glucose} mg/dL (⚠️ High - may indicate diabetes)")
                else:
                    findings.append(f"• Fasting Glucose: {glucose} mg/dL")
            
            if 'hba1c' in facts:
                hba1c = facts.get('hba1c')
                if hba1c and float(hba1c) > 6.5:
                    findings.append(f"• HbA1c: {hba1c}% (⚠️ High - diabetes indicator)")
                else:
                    findings.append(f"• HbA1c: {hba1c}%")
            
            # Cholesterol
            if 'total_cholesterol' in facts:
                findings.append(f"• Total Cholesterol: {facts.get('total_cholesterol')} mg/dL")
            if 'ldl' in facts:
                ldl = facts.get('ldl')
                findings.append(f"• LDL Cholesterol: {ldl} mg/dL (Bad Cholesterol)")
            if 'hdl' in facts:
                hdl = facts.get('hdl')
                findings.append(f"• HDL Cholesterol: {hdl} mg/dL (Good Cholesterol)")
            if 'triglycerides' in facts:
                findings.append(f"• Triglycerides: {facts.get('triglycerides')} mg/dL")
            
            if findings:
                summary_lines.append("\nHealth Findings:")
                summary_lines.extend(findings)
                summary = "\n".join(summary_lines)
            else:
                summary = text or "Unable to generate summary from report data"
        else:
            # Last resort: use text as-is
            summary = text or "Unable to generate summary"
        
        diet_plan_items = model_output.get('diet_plan', []) or []
        diagnosis = ""

        # Basic diagnosis logic based on facts
        diagnosis_parts = []
        if 'systolic_bp' in facts and facts['systolic_bp']:
            try:
                if float(facts['systolic_bp']) > 140:
                    diagnosis_parts.append("Possible hypertension (high blood pressure)")
                elif float(facts['systolic_bp']) > 130:
                    diagnosis_parts.append("Elevated blood pressure")
            except:
                pass
        if 'fasting_glucose' in facts and facts['fasting_glucose']:
            try:
                if float(facts['fasting_glucose']) > 126:
                    diagnosis_parts.append("Possible diabetes (high fasting glucose)")
                elif float(facts['fasting_glucose']) > 100:
                    diagnosis_parts.append("Prediabetes (elevated fasting glucose)")
            except:
                pass
        if 'hba1c' in facts and facts['hba1c']:
            try:
                if float(facts['hba1c']) > 6.5:
                    diagnosis_parts.append("Possible diabetes (high HbA1c)")
                elif float(facts['hba1c']) > 5.7:
                    diagnosis_parts.append("Prediabetes (elevated HbA1c)")
            except:
                pass
        if 'total_cholesterol' in facts and facts['total_cholesterol']:
            try:
                if float(facts['total_cholesterol']) > 240:
                    diagnosis_parts.append("High cholesterol")
            except:
                pass
        if diagnosis_parts:
            diagnosis = "; ".join(diagnosis_parts)
    
    # Ensure diet_plan is a list of strings
    if not isinstance(diet_plan_items, list):
        diet_plan_items = [str(diet_plan_items)]
    diet_plan_items = [str(item) if not isinstance(item, str) else item for item in diet_plan_items]
    
    # If no diet plan from Gemini, generate basic recommendations from facts
    if (not diet_plan_items or len(diet_plan_items) == 0) and facts:
        diet_plan_items = []
        if 'fasting_glucose' in facts and facts['fasting_glucose']:
            try:
                if float(facts['fasting_glucose']) > 126:
                    diet_plan_items.append("Reduce sugar and refined carbohydrates intake")
                    diet_plan_items.append("Increase fiber intake through whole grains and vegetables")
                    diet_plan_items.append("Eat lean proteins and control portion sizes")
            except:
                pass
        
        if 'total_cholesterol' in facts and facts['total_cholesterol']:
            try:
                if float(facts['total_cholesterol']) > 200:
                    diet_plan_items.append("Reduce saturated fats and cholesterol-rich foods")
                    diet_plan_items.append("Increase consumption of omega-3 rich foods (fish, walnuts)")
                    diet_plan_items.append("Include more fruits, vegetables, and whole grains")
            except:
                pass
        
        if 'systolic_bp' in facts and facts['systolic_bp']:
            try:
                if float(facts['systolic_bp']) > 140:
                    diet_plan_items.append("Reduce sodium (salt) intake in meals")
                    diet_plan_items.append("Increase potassium-rich foods (bananas, spinach, sweet potatoes)")
                    diet_plan_items.append("Stay hydrated and limit caffeine")
            except:
                pass

    print(f'[Formatter] Returning summary length: {len(summary) if summary else 0}, diagnosis: {bool(diagnosis)}, diet items: {len(diet_plan_items)}')
    return {
        'summary': summary,
        'diagnosis': diagnosis,
        'diet_plan': diet_plan_items
    }
