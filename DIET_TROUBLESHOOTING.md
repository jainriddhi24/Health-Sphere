# 🏥 Troubleshooting: Diet Recommendations Not Showing

## ✅ System Status: WORKING CORRECTLY

The meal recommendation system is functioning properly. If you're not seeing recommendations on the diet-plan page, follow these steps:

---

## 🔍 Diagnostic Checklist

### Step 1: Did You Upload a Medical Report?
**Required to see recommendations**

- [ ] Go to Dashboard → Upload Report
- [ ] Select a medical file (PDF, JPG, PNG, or TXT)
- [ ] Wait for upload to complete
- [ ] Should show "Report processed successfully"

❌ **If report didn't upload:**
- Check file format (PDF, JPG, PNG, or TXT only)
- Check file size (< 10MB recommended)
- Check browser console for errors

### Step 2: Check Browser Developer Console
**To verify data is being received**

1. Open Diet Plan page: `http://localhost:3000/dashboard/diet-plan`
2. Press `F12` or `Ctrl+Shift+I` to open Developer Console
3. Look for these logs:
   ```
   Profile response: {...}
   Processing result: {...}
   ```

✅ **If you see both logs:** Processing result is loaded ✓

❌ **If you see `undefined` for processing_result:**
   - Report hasn't been uploaded yet
   - Or backend didn't save it to database
   - Upload a new report and try again

### Step 3: Check the Data Structure
**In browser console, type:**

```javascript
// Should show the personalized diet plan with meals, conditions, etc.
console.log(localStorage.getItem('user_profile'))
```

Or check the Network tab:
1. Open DevTools → Network tab
2. Refresh the page
3. Find the `/auth/profile` request
4. Click it and check the Response
5. Look for `processing_result` field

✅ **You should see:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "processing_result": {
      "personalized_diet_plan": {
        "name": "Personalized Plan for diabetes",
        "conditions_detected": ["diabetes"],
        "meals": {...},
        "recommendations": [...],
        "restrictions": [...]
      }
    }
  }
}
```

### Step 4: Check Backend Database
**If frontend data looks empty**

Run this SQL query to verify:
```sql
SELECT id, name, processing_result 
FROM users 
WHERE id = 'your_user_id' 
LIMIT 1;
```

✅ **You should see a JSON object in `processing_result` column**

❌ **If NULL or empty:**
   - Report processor didn't save results
   - Re-upload the report

---

## 📋 Common Issues & Solutions

### Issue 1: "Based on Your Medical Report" Section Not Showing

**Cause:** `processing_result` is NULL or undefined

**Solution:**
1. Upload a new medical report
2. Wait for processing to complete
3. Refresh the diet-plan page
4. Check browser console logs

### Issue 2: Recommendations Show But No Meals

**Cause:** Lab values don't match condition thresholds

**Cause:** Report has recommendations but no detected conditions

**Solution:**
1. Upload a medical report with clear health indicators:
   - For diabetes: mention glucose, HbA1c, or "high blood sugar"
   - For hypertension: mention blood pressure > 140/90
   - For cholesterol: mention "high cholesterol" or lipid values
2. Check browser console to see detected conditions
3. If empty, add more detailed health information

### Issue 3: Wrong Meals Recommended

**Cause:** System detected different condition than expected

**Example:**
- You expect diabetes meals
- But system detected hypertension instead
- Because hypertension was mentioned in the report first

**Solution:**
- Check the "Detected Conditions" line
- It shows what the system found
- Upload a clearer report with specific lab values

### Issue 4: All Sections Show But Data Looks Generic

**Cause:** System couldn't detect any conditions from your report

**Example:**
- Plan name: "Personalized Plan for Balanced Diet"
- Confidence: 70% (instead of 95%)
- Generic meals instead of condition-specific

**Solution:**
- Report might have incomplete health information
- Re-upload with more specific clinical data
- Include lab values or clinical notes

---

## 🧪 Test with Sample Data

### Sample Report 1: Diabetes
```
Patient: John Smith
Date: 2024-11-30

Fasting Glucose: 165 mg/dL (HIGH)
HbA1c: 8.5% (HIGH)
```
**Expected:** Shows diabetes meals (oats, brown rice, etc.)

### Sample Report 2: Hypertension
```
Patient: Sarah Jones
Date: 2024-11-30

Blood Pressure: 155/95 mmHg (HIGH)
```
**Expected:** Shows hypertension meals (low-sodium, potassium-rich)

### Sample Report 3: Combined
```
Patient: Mike Brown
Date: 2024-11-30

Glucose: 165 mg/dL
Blood Pressure: 155/95 mmHg
Total Cholesterol: 285 mg/dL
```
**Expected:** Shows meals that balance all three conditions

---

## 🔧 Manual Testing

### Via Python Script
```bash
cd c:\Health-Sphere
python.exe debug-diet-flow.py
```

This shows the complete flow and what the frontend should receive.

### Via API Request
```bash
# 1. Get token by logging in first
# 2. Call profile endpoint with token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/auth/profile
```

Look for `processing_result` in the response.

---

## 🚀 Expected Behavior

### Before Upload
- Diet Plan page shows 4 pre-built plans
- No "Based on Your Medical Report" section

### After Upload (With Conditions)
- "Based on Your Medical Report" section appears
- Shows detected health conditions
- Shows 95% confidence score
- Shows condition-specific meals
- Shows dietary recommendations
- Shows food restrictions

### After Upload (No Conditions Detected)
- "Based on Your Medical Report" section appears
- Shows "General health recommendations"
- Shows 70% confidence score
- Shows balanced generic meals

---

## 📞 Quick Fix Steps

If recommendations aren't showing:

1. **Try uploading a new report:**
   ```
   Dashboard → Upload Report → Select file → Wait for "Success"
   ```

2. **Refresh the diet-plan page:**
   ```
   Ctrl+Shift+R (hard refresh)
   or Cmd+Shift+R (on Mac)
   ```

3. **Check browser console:**
   ```
   F12 → Console tab → Look for logs
   ```

4. **Verify with debug script:**
   ```
   python.exe debug-diet-flow.py
   ```

5. **Clear cache and login again:**
   ```
   Clear all localStorage
   Logout and login again
   Upload report and go to diet-plan
   ```

---

## ✅ Verification Checklist

- [ ] Medical report uploaded successfully
- [ ] Processing shows "success" status
- [ ] Browser console shows `processing_result` data
- [ ] Network tab shows `/auth/profile` has `personalized_diet_plan`
- [ ] Detected conditions are in the response
- [ ] Meals array has at least one meal
- [ ] Recommendations array is not empty
- [ ] "Based on Your Medical Report" section is visible
- [ ] Detected conditions are displayed correctly
- [ ] Meals are showing with calorie counts
- [ ] Recommendations are condition-specific
- [ ] Restrictions are relevant to conditions

---

## 🎯 Summary

**The system works as designed:**
- ✅ Analyzes uploaded medical reports
- ✅ Extracts health conditions from lab values
- ✅ Recommends meals from evidence-based database
- ✅ Displays personalized plans in frontend
- ✅ NO hallucinations (database-only)

**If recommendations aren't showing:**
- Most likely: Report hasn't been uploaded yet
- Or: Report lacks specific health indicators
- Check browser console and database for debugging
