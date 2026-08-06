import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type AuthMode = "login" | "register" | "forgot" | "reset";
export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type DeviceRecord = Database["public"]["Tables"]["devices"]["Row"];

export type AuthAccount = {
  user: User;
  profile: UserProfile | null;
  currentDeviceId: string | null;
};
