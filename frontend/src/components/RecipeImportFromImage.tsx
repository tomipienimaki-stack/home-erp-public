import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload } from 'lucide-react';
import { RecipesAPI } from '../lib/api';
import { downscaleToJpegBase64 } from '../lib/image';
import { type RecipeFormValues } from './RecipeForm';
import type { PantryCategory, PantryUnit } from '../types';

interface Props {
  onExtracted: (values: RecipeFormValues) => void;
}

export function RecipeImportFromImage({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    let base64: string;
    try {
      base64 = await downscaleToJpegBase64(file);
    } catch {
      setError('Kuvan käsittely epäonnistui. Kokeile toista kuvaa.');
      return;
    }
    // Vercel Functionin pyynnön runko saa olla enintään 4,5 MB; base64 on ~4/3 raakakoosta.
    if (base64.length * 0.75 > 3 * 1024 * 1024) {
      setError('Kuva on liian suuri pienennyksen jälkeenkin (yli 3 MB). Kokeile toista kuvaa.');
      return;
    }
    setPreview(`data:image/jpeg;base64,${base64}`);
    setLoading(true);
    try {
      const extracted = await RecipesAPI.importFromImage(base64, 'image/jpeg');
      onExtracted({
        name: extracted.name,
        description: extracted.description ?? '',
        servings: extracted.servings ?? 2,
        prep_time_min: extracted.prep_time_min ?? '',
        cook_time_min: extracted.cook_time_min ?? '',
        meal_type: extracted.meal_type,
        instructions: extracted.instructions ?? '',
        tags: extracted.tags ?? [],
        ingredients: extracted.ingredients.map((i) => ({
          name: i.name,
          quantity: Number(i.quantity) || 1,
          unit: i.unit as PantryUnit,
          category: i.category as PantryCategory,
          notes: i.notes ?? '',
        })),
      });
    } catch (e: any) {
      setError(e?.message ?? 'Tuonti epäonnistui');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="card p-6 sm:p-8 border-2 border-dashed border-cream-200 text-center hover:border-forest-400 transition cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {preview ? (
          <img src={preview} alt="esikatselu" className="max-h-80 mx-auto rounded-xl shadow-soft" />
        ) : (
          <>
            <div className="mx-auto w-12 h-12 grid place-items-center rounded-2xl bg-forest-50 text-forest-600 mb-3">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div className="font-display text-lg text-forest-700">Pudota kuva tähän</div>
            <div className="text-sm text-ink-500 mt-1">
              tai klikkaa valitaksesi · jpg/png/webp/gif (pienennetään automaattisesti)
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {loading && (
        <div className="card flex items-center gap-3 p-4">
          <Loader2 className="w-4 h-4 animate-spin text-forest-600" />
          <span className="text-sm text-ink-700">Claude lukee kuvaa…</span>
        </div>
      )}
      {error && (
        <div className="card p-4 bg-terracotta-50 ring-1 ring-terracotta-100 text-terracotta-600 text-sm">
          {error}
        </div>
      )}
      {!loading && !preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-soft w-full"
        >
          <Upload className="w-4 h-4" /> Valitse kuva
        </button>
      )}
    </div>
  );
}
