import { useState, useEffect } from "react";
import { Network } from "@capacitor/network";

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get initial status
    Network.getStatus().then((status) => {
      setIsOnline(status.connected);
    });

    // Listen for changes
    const handler = Network.addListener("networkStatusChange", (status) => {
      setIsOnline(status.connected);
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, []);

  return { isOnline };
}
