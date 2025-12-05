# 📋 Diet Recommendations Setup Guide

## ✅ Why Recommendations Aren't Showing

If you're at `http://localhost:3000/dashboard/diet-plan` and don't see the **"Based on Your Medical Report"** section with recommendations, it's because:

**No medical report has been uploaded yet** or **the report hasn't been processed**

---

## 🚀 To See Recommendations: 3 Simple Steps

### Step 1: Upload a Medical Report
```
1. Go to Dashboard (http://localhost:3000/dashboard)
2. Look for "Upload Report" section
3. Click "Upload Medical Report"
4. Select a medical file (PDF, JPG, PNG, or TXT)
5. Wait for "Report processed successfully" message
```

**Sample Report Content (copy-paste into a text file):**
```
MEDICAL REPORT
Date: 2024-11-30
Patient: Test Patient

LABORATORY RESULTS:
- Fasting Glucose: 165 mg/dL [HIGH]
- HbA1c: 8.5% [HIGH]
- Systolic Blood Pressure: 155 mmHg [HIGH]
- Diastolic Blood Pressure: 95 mmHg [HIGH]

CLINICAL ASSESSMENT:
Patient shows elevated fasting glucose indicating poor 
glycemic control. HbA1c of 8.5% confirms persistent 
hyperglycemia. Blood pressure is elevated.

DIAGNOSIS: Diabetes, Hypertension
```

### Step 2: Go to Diet Plan Page
```
Click: Dashboard → Diet Plan
or visit: http://localhost:3000/dashboard/diet-plan
```

### Step 3: See Recommendations
**The "🏥 Based on Your Medical Report" section should appear with:**
- ✅ Detected Conditions (e.g., "diabetes, hypertension")
- ✅ Confidence Score (95%)
- ✅ 4 Meal Recommendations (breakfast, lunch, dinner, snacks)
- ✅ Dietary Recommendations (tips specific to your conditions)
- ✅ Food Restrictions (what to avoid)

---

## 📊 What Conditions Get Detected?

The system automatically detects these conditions from your medical report:

| Condition | Detected When | Example Lab Values |
|-----------|--------------|-------------------|
| **Diabetes** | Mentions glucose, HbA1c, or blood sugar | Glucose > 126 mg/dL or HbA1c > 6.5% |
| **Hypertension** | Mentions blood pressure | BP > 140/90 mmHg |
| **Hyperlipidemia** | Mentions cholesterol | Cholesterol > 200 mg/dL |
| **Anemia** | Mentions hemoglobin or iron | Hemoglobin < 12 g/dL |
| **Others** | Celiac, GERD, Kidney Disease, Thyroid | See specific keywords |

---

## 🎯 Expected Results After Upload

### If Report Has Clear Health Indicators:

```
🏥 Based on Your Medical Report

Detected Conditions: diabetes, hypertension
Confidence: 95%

🌅 Breakfast
Oatmeal with banana and walnuts    380 cal

🍽️ Lunch
Grilled chicken breast with sweet potato    420 cal

🌙 Dinner
Lean turkey with quinoa and kale    400 cal

🍎 Snacks
Banana    90 cal

✅ Recommendations
• Reduce salt intake to less than 2300mg per day
• Eat potassium-rich foods
• Monitor portion sizes, especially carbohydrates
• Include fiber-rich foods to control blood sugar

⚠️ Restrictions
• Sugary drinks
• Cured meats
• High-sodium foods
• White bread
• Added sugars
```

### If Report Has Vague/Generic Information:

```
🏥 Based on Your Medical Report

Detected Conditions: (none - general recommendations)
Confidence: 70%

Meals will be generic balanced options
Recommendations will be general health tips
```

---

## 🔧 How to Verify It's Working

### Check 1: Browser Console
1. Open Diet Plan page
2. Press `F12` (Developer Tools)
3. Go to Console tab
4. Look for this output:
   ```
   Profile response: {...}
   Processing result: {personalized_diet_plan: {...}}
   ```

✅ **If you see it:** System working correctly

❌ **If you see `undefined`:** Upload a report first

### Check 2: Run Debug Script
```bash
cd c:\Health-Sphere
python.exe debug-diet-flow.py
```

This shows exactly what the system generates for a sample report with diabetes and hypertension.

### Check 3: Check Database
```sql
SELECT processing_result 
FROM users 
WHERE email = 'your_email@example.com';
```

Should contain personalized_diet_plan data after uploading a report.

---

## 💡 Sample Reports to Test

### Report 1: Diabetes Only
```
FASTING GLUCOSE: 165 mg/dL (HIGH - normal is 70-100)
HBA1C: 8.5% (HIGH - normal is <5.7%)
```
✅ Should show: Low-GI meals like oats, brown rice, lentils

### Report 2: Hypertension Only
```
BLOOD PRESSURE: 155/95 mmHg (HIGH - normal is <120/80)
```
✅ Should show: Low-sodium meals like chicken, sweet potato, leafy greens

### Report 3: Combined
```
GLUCOSE: 165 mg/dL (HIGH)
BLOOD PRESSURE: 155/95 mmHg (HIGH)
CHOLESTEROL: 285 mg/dL (HIGH)
```
✅ Should show: Meals that balance all three conditions

---

## ⚠️ Troubleshooting

**"I uploaded a report but don't see recommendations"**
→ Refresh the page (`Ctrl+Shift+R`)
→ Check browser console for errors
→ Try uploading again

**"I see recommendations but they're generic"**
→ Your report didn't have clear health indicators
→ Upload a new report with specific lab values

**"Recommendations show wrong meals"**
→ System detected a different condition than expected
→ Check the "Detected Conditions" line to see what was found
→ Upload a report with clearer information about your condition

**"Nothing shows at all"**
→ Reload the page completely
→ Clear browser cache (`Ctrl+Shift+Delete`)
→ Try uploading a report again

---

## 🎯 Key Points

✅ **System is READY and WORKING**
- Detects health conditions from medical reports
- Recommends appropriate meals from evidence-based database
- NO hallucinations (only database lookups)
- Shows confidence scores
- Includes medical disclaimers

✅ **To See Recommendations:**
1. Upload a medical report (key step!)
2. Go to Diet Plan page
3. See personalized recommendations

✅ **Reports Needed:**
- With specific health indicators (glucose, BP, cholesterol, etc.)
- Or clinical notes mentioning diagnoses
- At least 50 characters of relevant health information

✅ **What Gets Displayed:**
- Detected health conditions
- Personalized meal plans
- Dietary recommendations
- Food restrictions
- Confidence score
- Medical disclaimer

---

## 📞 Quick Start

```
1. Upload Report → Dashboard → "Upload Medical Report" button
2. Go to Diet Plan → Click "Diet Plan" in sidebar
3. See recommendations → "Based on Your Medical Report" section
4. Done! 🎉
```

If you don't see the section, you haven't uploaded a report yet. Upload one and come back!
