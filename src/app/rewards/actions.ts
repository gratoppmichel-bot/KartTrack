"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RewardState = { error?: string } | undefined;

export async function claimReward(_prev: RewardState, formData: FormData): Promise<RewardState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_reward", { p_reward: String(formData.get("reward")) });
  if (error) return { error: error.message };
  revalidatePath("/rewards");
  revalidatePath("/");
  return undefined;
}

export async function equipReward(formData: FormData) {
  const reward = String(formData.get("reward") ?? "");
  const supabase = await createClient();
  await supabase.rpc("equip_reward", { p_reward: reward || null });
  revalidatePath("/rewards");
  revalidatePath("/");
}
