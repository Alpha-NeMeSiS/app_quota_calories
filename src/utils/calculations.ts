export interface UserProfile {
  sexe: 'M' | 'F';
  date_naissance: string;
  taille_cm: number;
  poids_kg: number;
  body_fat_pct?: number;
}

export interface GoalParams {
  type: 'loss' | 'maintain' | 'gain';
  activity_level: number;
  method: 'mifflin' | 'katch';
  deficit_or_surplus_pct: number;
  protein_g_per_kg: number;
  fat_g_per_kg_min: number;
}

export interface MacroTargets {
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export function calculateAge(dateNaissance: string): number {
  const birthDate = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function calculateBMR(profile: UserProfile, method: 'mifflin' | 'katch' = 'mifflin'): number {
  const { sexe, date_naissance, taille_cm, poids_kg, body_fat_pct } = profile;
  const age = calculateAge(date_naissance);

  if (method === 'katch' && body_fat_pct !== undefined && body_fat_pct !== null) {
    const lbm = poids_kg * (1 - body_fat_pct / 100);
    return 370 + 21.6 * lbm;
  }

  if (sexe === 'M') {
    return 10 * poids_kg + 6.25 * taille_cm - 5 * age + 5;
  } else {
    return 10 * poids_kg + 6.25 * taille_cm - 5 * age - 161;
  }
}

export function calculateTDEE(bmr: number, activityLevel: number): number {
  return bmr * activityLevel;
}

export function calculateTargetCalories(tdee: number, goalType: 'loss' | 'maintain' | 'gain', deficitOrSurplusPct: number): number {
  if (goalType === 'maintain') {
    return Math.round(tdee);
  }

  if (goalType === 'loss') {
    const deficit = Math.abs(deficitOrSurplusPct) / 100;
    return Math.round(tdee * (1 - deficit));
  }

  const surplus = Math.abs(deficitOrSurplusPct) / 100;
  return Math.round(tdee * (1 + surplus));
}

export function calculateMacros(
  targetCalories: number,
  poids_kg: number,
  protein_g_per_kg: number,
  fat_g_per_kg_min: number
): MacroTargets {
  const protein_g = Math.max(1.6, protein_g_per_kg) * poids_kg;

  const minFatFromWeight = fat_g_per_kg_min * poids_kg;
  const minFatFromCalories = (0.25 * targetCalories) / 9;
  const fat_g = Math.max(minFatFromWeight, minFatFromCalories);

  const remainingCalories = targetCalories - (protein_g * 4 + fat_g * 9);
  const carbs_g = Math.max(0, remainingCalories / 4);

  return {
    calories_kcal: Math.round(targetCalories),
    protein_g: Math.round(protein_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
  };
}

export function calculateCompleteTargets(profile: UserProfile, goal: GoalParams): MacroTargets {
  const bmr = calculateBMR(profile, goal.method);
  const tdee = calculateTDEE(bmr, goal.activity_level);
  const targetCalories = calculateTargetCalories(tdee, goal.type, goal.deficit_or_surplus_pct);

  return calculateMacros(
    targetCalories,
    profile.poids_kg,
    goal.protein_g_per_kg,
    goal.fat_g_per_kg_min
  );
}

export interface DailySummary {
  date: string;
  consumed: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  target: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  delta: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  status: 'under' | 'ok' | 'over';
}

export function calculateDailySummary(
  entries: Array<{ kcal: number; protein_g: number; fat_g: number; carbs_g: number }>,
  target: { calories_kcal: number; protein_g: number; fat_g: number; carbs_g: number },
  date: string
): DailySummary {
  const consumed = entries.reduce(
    (acc, entry) => ({
      calories_kcal: acc.calories_kcal + entry.kcal,
      protein_g: acc.protein_g + entry.protein_g,
      fat_g: acc.fat_g + entry.fat_g,
      carbs_g: acc.carbs_g + entry.carbs_g,
    }),
    { calories_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );

  const delta = {
    calories_kcal: Math.round((consumed.calories_kcal - target.calories_kcal) * 10) / 10,
    protein_g: Math.round((consumed.protein_g - target.protein_g) * 10) / 10,
    fat_g: Math.round((consumed.fat_g - target.fat_g) * 10) / 10,
    carbs_g: Math.round((consumed.carbs_g - target.carbs_g) * 10) / 10,
  };

  const caloriesDiffPct = (Math.abs(delta.calories_kcal) / target.calories_kcal) * 100;

  let status: 'under' | 'ok' | 'over' = 'ok';
  if (caloriesDiffPct > 5) {
    status = delta.calories_kcal < 0 ? 'under' : 'over';
  }

  return {
    date,
    consumed: {
      calories_kcal: Math.round(consumed.calories_kcal),
      protein_g: Math.round(consumed.protein_g * 10) / 10,
      fat_g: Math.round(consumed.fat_g * 10) / 10,
      carbs_g: Math.round(consumed.carbs_g * 10) / 10,
    },
    target,
    delta,
    status,
  };
}

export function getActivityLevelLabel(level: number): string {
  if (level <= 1.2) return 'Sédentaire (peu ou pas d\'exercice)';
  if (level <= 1.375) return 'Légèrement actif (1-3 jours/semaine)';
  if (level <= 1.55) return 'Modérément actif (3-5 jours/semaine)';
  if (level <= 1.725) return 'Très actif (6-7 jours/semaine)';
  return 'Extrêmement actif (2x par jour)';
}

export function getGoalTypeLabel(type: 'loss' | 'maintain' | 'gain'): string {
  switch (type) {
    case 'loss':
      return 'Perte de poids';
    case 'maintain':
      return 'Maintien';
    case 'gain':
      return 'Prise de masse';
  }
}
