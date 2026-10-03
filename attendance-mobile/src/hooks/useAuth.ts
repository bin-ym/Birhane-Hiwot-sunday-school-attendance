import { useCallback, useEffect, useState } from "react";
import type { MobileUser } from "../types";
import {
  clearSession,
  getServerUrl,
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
      const url = await getServerUrl();
      setServerUrl(url);
      setUser(await getUser());
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (url: string, email: string, password: string) => {
      const cleanUrl = url.trim().replace(/\/$/, "");
      const { token, user: loggedInUser } = await loginMobile(
        cleanUrl,
        email,
        password,
      );
      await saveSettings({
        serverUrl: cleanUrl,
        token,
        userJson: JSON.stringify(loggedInUser),
      });
      setServerUrl(cleanUrl);
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
  }, []);

  return { user, serverUrl, loading, login, logout };
}
