import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCompleteTargets } from '../../utils/calculations';

interface FormData {
  sexe: 'M' | 'F';
  date_naissance: string;
  taille_cm: number;
  poids_kg: number;
  body_fat_pct?: number;
  activity_level: number;
  goal_type: 'loss' | 'maintain' | 'gain';
  deficit_or_surplus_pct: number;
}

export function OnboardingForm() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    sexe: 'M',
    date_naissance: '',
    taille_cm: 170,
    poids_kg: 70,
    body_fat_pct: undefined,
    activity_level: 1.55,
    goal_type: 'maintain',
    deficit_or_surplus_pct: 15,
  });

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email!,
        sexe: formData.sexe,
        date_naissance: formData.date_naissance,
        taille_cm: formData.taille_cm,
        poids_kg: formData.poids_kg,
        body_fat_pct: formData.body_fat_pct || null,
      });

      if (profileError) throw profileError;

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          type: formData.goal_type,
          activity_level: formData.activity_level,
          method: formData.body_fat_pct ? 'katch' : 'mifflin',
          deficit_or_surplus_pct: formData.deficit_or_surplus_pct,
          protein_g_per_kg: 2.0,
          fat_g_per_kg_min: 0.8,
          is_active: true,
        })
        .select()
        .single();

      if (goalError) throw goalError;

      const targets = calculateCompleteTargets(
        {
          sexe: formData.sexe,
          date_naissance: formData.date_naissance,
          taille_cm: formData.taille_cm,
          poids_kg: formData.poids_kg,
          body_fat_pct: formData.body_fat_pct,
        },
        {
          type: formData.goal_type,
          activity_level: formData.activity_level,
          method: formData.body_fat_pct ? 'katch' : 'mifflin',
          deficit_or_surplus_pct: formData.deficit_or_surplus_pct,
          protein_g_per_kg: 2.0,
          fat_g_per_kg_min: 0.8,
        }
      );

      const today = new Date().toISOString().split('T')[0];

      const { error: targetError } = await supabase.from('daily_targets').insert({
        user_id: user.id,
        date: today,
        calories_kcal: targets.calories_kcal,
        protein_g: targets.protein_g,
        fat_g: targets.fat_g,
        carbs_g: targets.carbs_g,
        fiber_g: 25,
        goal_id: goalData.id,
      });

      if (targetError) throw targetError;

      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Informations personnelles</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sexe</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => updateFormData('sexe', 'M')}
                className={`flex-1 py-3 px-4 border-2 rounded-md font-medium transition-colors ${
                  formData.sexe === 'M'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Homme
              </button>
              <button
                type="button"
                onClick={() => updateFormData('sexe', 'F')}
                className={`flex-1 py-3 px-4 border-2 rounded-md font-medium transition-colors ${
                  formData.sexe === 'F'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Femme
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="date_naissance" className="block text-sm font-medium text-gray-700 mb-1">
              Date de naissance
            </label>
            <input
              type="date"
              id="date_naissance"
              value={formData.date_naissance}
              onChange={(e) => updateFormData('date_naissance', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="taille_cm" className="block text-sm font-medium text-gray-700 mb-1">
                Taille (cm)
              </label>
              <input
                type="number"
                id="taille_cm"
                value={formData.taille_cm}
                onChange={(e) => updateFormData('taille_cm', Number(e.target.value))}
                min="100"
                max="250"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="poids_kg" className="block text-sm font-medium text-gray-700 mb-1">
                Poids (kg)
              </label>
              <input
                type="number"
                id="poids_kg"
                value={formData.poids_kg}
                onChange={(e) => updateFormData('poids_kg', Number(e.target.value))}
                min="30"
                max="300"
                step="0.1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="body_fat_pct" className="block text-sm font-medium text-gray-700 mb-1">
              Pourcentage de masse grasse (optionnel)
            </label>
            <input
              type="number"
              id="body_fat_pct"
              value={formData.body_fat_pct || ''}
              onChange={(e) => updateFormData('body_fat_pct', e.target.value ? Number(e.target.value) : undefined)}
              min="5"
              max="50"
              step="0.1"
              placeholder="Si connu"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Si fourni, la formule Katch-McArdle sera utilisée pour plus de précision
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!formData.date_naissance}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Votre objectif</h2>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Niveau d'activité</label>
          <select
            value={formData.activity_level}
            onChange={(e) => updateFormData('activity_level', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1.2}>Sédentaire (peu ou pas d'exercice)</option>
            <option value={1.375}>Légèrement actif (1-3 jours/semaine)</option>
            <option value={1.55}>Modérément actif (3-5 jours/semaine)</option>
            <option value={1.725}>Très actif (6-7 jours/semaine)</option>
            <option value={1.9}>Extrêmement actif (2x par jour)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Objectif</label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => updateFormData('goal_type', 'loss')}
              className={`py-3 px-4 border-2 rounded-md font-medium transition-colors ${
                formData.goal_type === 'loss'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Perte de poids
            </button>
            <button
              type="button"
              onClick={() => updateFormData('goal_type', 'maintain')}
              className={`py-3 px-4 border-2 rounded-md font-medium transition-colors ${
                formData.goal_type === 'maintain'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Maintien
            </button>
            <button
              type="button"
              onClick={() => updateFormData('goal_type', 'gain')}
              className={`py-3 px-4 border-2 rounded-md font-medium transition-colors ${
                formData.goal_type === 'gain'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Prise de masse
            </button>
          </div>
        </div>

        {formData.goal_type !== 'maintain' && (
          <div>
            <label htmlFor="deficit_or_surplus_pct" className="block text-sm font-medium text-gray-700 mb-1">
              {formData.goal_type === 'loss' ? 'Déficit calorique (%)' : 'Surplus calorique (%)'}
            </label>
            <input
              type="number"
              id="deficit_or_surplus_pct"
              value={formData.deficit_or_surplus_pct}
              onChange={(e) => updateFormData('deficit_or_surplus_pct', Number(e.target.value))}
              min="5"
              max="30"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.goal_type === 'loss'
                ? 'Recommandé : 10-20% pour une perte durable'
                : 'Recommandé : 5-15% pour une prise de masse contrôlée'}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setStep(1)}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
          >
            {loading ? 'Création...' : 'Commencer'}
          </button>
        </div>
      </div>
    </div>
  );
}
