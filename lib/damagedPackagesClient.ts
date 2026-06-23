import { DataArrayTexture } from "three";
import { API_BASE, errorMessage} from "./apiClient";

//match expected json
export interface DamageResult{
  label: string;
  confidence: number;                       // 0..1
  probabilities: Record<string, number>;    // { damaged: 0.x, intact: 0.x }
}


export async function analyze(file:File): Promise<DamageResult>{
    const form = new FormData();
    form.append("image", file);
    const result = await fetch(`${API_BASE}/damaged-packages/analyze`, {
    method: "POST",
    body: form,
  });
    if (!result.ok) throw new Error(await errorMessage(result, "Analysis failed"));
    return result.json();
}