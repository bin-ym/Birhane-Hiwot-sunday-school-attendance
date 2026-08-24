import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";

export function useNetwork() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    Network.getStatus().then((s) => {
      if (mounted) setOnline(s.connected);
    });

    const handle = Network.addListener("networkStatusChange", (s) => {
      setOnline(s.connected);
    });

    return () => {
      mounted = false;
      handle.then((h) => h.remove());
    };
  }, []);

  return online;
}
