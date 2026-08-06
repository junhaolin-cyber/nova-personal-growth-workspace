"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { getAuthErrorMessage } from "./errors";
import { getCurrentDeviceInfo, getOrCreateDeviceId } from "./device";
import type { AuthAccount, DeviceRecord, UserProfile } from "./types";

type ClientState = {
  client: SupabaseClient<Database> | null;
  error: string | null;
};

export function useAuthAccount() {
  const [{ client, error: clientError }] = React.useState<ClientState>(() => {
    try {
      return { client: createSupabaseBrowserClient(), error: null };
    } catch (error) {
      return { client: null, error: getAuthErrorMessage(error) };
    }
  });
  const [account, setAccount] = React.useState<AuthAccount | null>(null);
  const [devices, setDevices] = React.useState<DeviceRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(clientError);

  const loadAccount = React.useCallback(async () => {
    if (!client) {
      setIsLoading(false);
      return;
    }

    setError(null);
    const { data, error: userError } = await client.auth.getUser();
    if (userError || !data.user) {
      setAccount(null);
      setDevices([]);
      setIsLoading(false);
      if (userError && !userError.message.toLowerCase().includes("auth session missing")) setError(getAuthErrorMessage(userError));
      return;
    }

    const user = data.user;
    const deviceId = getOrCreateDeviceId(user.id);
    const deviceInfo = getCurrentDeviceInfo();
    const [profileResult, deviceResult] = await Promise.all([
      client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      client.from("devices").upsert({ id: deviceId, user_id: user.id, device_name: deviceInfo.deviceName, device_type: deviceInfo.deviceType, platform: deviceInfo.platform, last_seen_at: new Date().toISOString() }, { onConflict: "id" }).select("*").single(),
    ]);

    const profile = profileResult.data as UserProfile | null;
    setAccount({ user, profile, currentDeviceId: deviceResult.data?.id ?? deviceId });
    if (deviceResult.data) setDevices((current) => current.length ? current : [deviceResult.data]);
    setIsLoading(false);
    if (profileResult.error || deviceResult.error) setError("账号资料或设备信息暂时无法更新，请稍后重试。");
  }, [client]);

  React.useEffect(() => {
    void loadAccount();
    if (!client) return undefined;

    const { data } = client.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadAccount(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [client, loadAccount]);

  const loadDevices = React.useCallback(async () => {
    if (!client || !account) return;
    const { data, error: devicesError } = await client.from("devices").select("*").order("last_seen_at", { ascending: false, nullsFirst: false });
    if (devicesError) {
      setError("暂时无法读取设备列表，请稍后重试。");
      return;
    }
    setDevices(data ?? []);
  }, [account, client]);

  const updateProfile = React.useCallback(async (updates: Pick<UserProfile, "display_name" | "language" | "timezone">) => {
    if (!client || !account) return { error: "当前没有登录用户。" };
    const nextProfile = {
      display_name: updates.display_name?.trim() || null,
      language: updates.language.trim() || "zh-CN",
      timezone: updates.timezone.trim() || "Asia/Shanghai",
    };
    const { data, error: updateError } = await client.from("profiles").update(nextProfile).eq("id", account.user.id).select("*").single();
    if (updateError || !data) return { error: getAuthErrorMessage(updateError) };
    setAccount((current) => current ? { ...current, profile: data } : current);
    return { error: null };
  }, [account, client]);

  const signOut = React.useCallback(async () => {
    if (!client) return { error: clientError ?? "账号服务暂时不可用。" };
    const { error: signOutError } = await client.auth.signOut();
    return { error: signOutError ? getAuthErrorMessage(signOutError) : null };
  }, [client, clientError]);

  return { account, devices, isLoading, error, loadDevices, updateProfile, signOut };
}
