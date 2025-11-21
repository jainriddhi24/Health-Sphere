export function normalizeWorkoutType(rawType: string): string {
    const type = rawType.trim().toLowerCase();
  
    // Mapping flexible labels → standard types
    const mapping: { [key: string]: string } = {
      "walk": "walking",
      "walking": "walking",
      "brisk walk": "walking",
      "evening walk": "walking",
  
      "run": "running",
      "running": "running",
      "jog": "running",
      "jogging": "running",
  
      "gym": "strength",
      "strength training": "strength",
      "weights": "strength",
      "weightlifting": "strength",
  
      "cycle": "cycling",
      "cycling": "cycling",
      "bike": "cycling",
      "biking": "cycling",
  
      "swim": "swimming",
      "swimming": "swimming",
  
      "cardio": "cardio",
  
      "yoga": "yoga",
      "pilates": "pilates",
    };
  
    return mapping[type] || "other"; // fallback
  }
  