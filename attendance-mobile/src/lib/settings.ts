import { Preferences } from "@capacitor/preferences";
import type { AppSettings, MobileUser } from "../types";

const SETTINGS_KEY = "app_settings";

export async function getSettings(): Promise<AppSettings | null> {
  const { value } = await Preferences.get({ key: SETTINGS_KEY });
  if (!value) return null;
  return JSON.parse(value) as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await Preferences.set({
    key: SETTINGS_KEY,
    value: JSON.stringify(settings),
  });
}

export const DEFAULT_SERVER_URL = "https://birhane-hiwot-sunday-school-attendance.vercel.app";

export async function getServerUrl(): Promise<string> {
  const settings = await getSettings();
  return settings?.serverUrl?.replace(/\/$/, "") || DEFAULT_SERVER_URL;
}

export async function getToken(): Promise<string | null> {
  const settings = await getSettings();
  return settings?.token || null;
}

export async function getUser(): Promise<MobileUser | null> {
  const settings = await getSettings();
  if (!settings?.userJson) return null;
  try {
    return JSON.parse(settings.userJson) as MobileUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Preferences.remove({ key: SETTINGS_KEY });
}

export function normalizeGrades(grade?: string | string[]): string[] {
  if (!grade) return [];
  return Array.isArray(grade) ? grade : [grade];
}
