import { Request, Response } from 'express';

/**
 * GET /assistant/check-warnings
 * Get preventive health warnings and recommendations
 */
export const checkWarnings = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = req.method === 'POST' ? req.body : req.query;
    // Simple demo logic: if user has high risk score or chronic condition, return a warning
    const warnings: any[] = [];
    const risk = typeof profile.current_risk_score === 'number' ? profile.current_risk_score : Number(profile.current_risk_score || 0);
    const chronic = profile.chronic_condition || profile.chronicCondition || '';

    if (risk && risk >= 0.7) {
      warnings.push({ id: 'high_risk', message: 'High health risk detected — consult a clinician', severity: 'high' });
    } else if (risk && risk >= 0.4) {
      warnings.push({ id: 'moderate_risk', message: 'Moderate risk — consider dietary adjustments', severity: 'medium' });
    }
    if (typeof chronic === 'string' && chronic.toLowerCase().includes('diabetes')) {
      warnings.push({ id: 'diabetes', message: 'High sugar meals may cause spikes; reduce sugary foods', severity: 'high' });
    }

    const summary = warnings.length ? `${warnings.length} warning(s) identified` : 'No immediate warnings';

    res.json({ success: true, warnings, summary });
    return;
  } catch (err: any) {
    console.error('Error in checkWarnings:', err);
    res.status(500).json({ success: false, error: { code: 'ERROR', message: 'Failed to evaluate warnings' } });
  }
};

