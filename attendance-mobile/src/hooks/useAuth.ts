import { useCallback, useEffect, useState } from "react";
import type { MobileUser } from "../types";
import {
  clearSession,
  getSettings,
  getUser,
  saveSettings,
} from "../lib/settings";
import { loginMobile } from "../lib/api";
import { pullStudents, syncPendingAttendance } from "../lib/sync";

export function useAuth() {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      setServerUrl(settings?.serverUrl || "");
      setUser(await getUser());
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (url: string, email: string, password: string) => {
      const { token, user: loggedInUser } = await loginMobile(
        url,
        email,
        password,
      );
      await saveSettings({
        serverUrl: url.replace(/\/$/, ""),
        token,
        userJson: JSON.stringify(loggedInUser),
      });
      setServerUrl(url.replace(/\/$/, ""));
      setUser(loggedInUser);
      try {
        await pullStudents();
        await syncPendingAttendance();
      } catch {
        // offline login is allowed — students sync when online
      }
      return loggedInUser;
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setServerUrl("");
  }, []);

  return { user, serverUrl, loading, login, logout };
}
