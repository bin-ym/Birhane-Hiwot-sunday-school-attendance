import { Preferences } from "@capacitor/preferences";
import type { AppSettings, MobileUser } from "../types";

const SETTINGS_KEY = "app_settings";
const SERVER_URL_KEY = "bh_server_url";

export const DEFAULT_SERVER_URL = "https://birhane-hiwot-sunday-school-attendance.vercel.app";

export async function getSavedServerUrl(): Promise<string> {
  const { value } = await Preferences.get({ key: SERVER_URL_KEY });
  if (value && value.trim()) return value.trim().replace(/\/$/, "");
  const settings = await getSettings();
  if (settings?.serverUrl && settings.serverUrl.trim()) {
    return settings.serverUrl.trim().replace(/\/$/, "");
  }
  return DEFAULT_SERVER_URL;
}

export async function saveServerUrl(url: string): Promise<void> {
  const clean = (url || "").trim().replace(/\/$/, "");
  await Preferences.set({
    key: SERVER_URL_KEY,
    value: clean,
  });
}

export async function getSettings(): Promise<AppSettings | null> {
  const { value } = await Preferences.get({ key: SETTINGS_KEY });
  if (!value) return null;
  return JSON.parse(value) as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (settings.serverUrl) {
    await saveServerUrl(settings.serverUrl);
  }
  await Preferences.set({
    key: SETTINGS_KEY,
    value: JSON.stringify(settings),
  });
}

export async function getServerUrl(): Promise<string> {
  return getSavedServerUrl();
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
  // Preserve server URL when clearing credentials
  const currentServerUrl = await getSavedServerUrl();
  await Preferences.remove({ key: SETTINGS_KEY });
  if (currentServerUrl) {
    await saveServerUrl(currentServerUrl);
  }
}

export function normalizeGrades(grade?: string | string[]): string[] {
  if (!grade) return [];
  return Array.isArray(grade) ? grade : [grade];
}
