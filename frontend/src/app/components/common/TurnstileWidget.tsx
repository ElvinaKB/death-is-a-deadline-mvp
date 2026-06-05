import { useEffect, useRef } from "react";
import {
  getTurnstileSiteKey,
  isTurnstileDemoMode,
  isTurnstileEnabled,
} from "../../../config/turnstile.config";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export { isTurnstileEnabled, isTurnstileDemoMode } from "../../../config/turnstile.config";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Turnstile script failed to load")),
      );
      if (window.turnstile) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

interface TurnstileWidgetProps {
  widgetRef?: React.RefObject<TurnstileWidgetHandle | null>;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
  /** `normal` shows the classic checkbox-style widget */
  size?: "normal" | "compact" | "flexible";
}

export function TurnstileWidget({
  widgetRef,
  onToken,
  onExpire,
  onError,
  className,
  size = "normal",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const siteKey = getTurnstileSiteKey();

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!isTurnstileEnabled() || !containerRef.current || !siteKey) {
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          size,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => {
            onExpireRef.current?.();
          },
          "error-callback": () => {
            onErrorRef.current?.();
          },
        });
      })
      .catch(() => {
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, size]);

  useEffect(() => {
    if (!widgetRef) return;
    widgetRef.current = {
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        onExpire?.();
      },
    };
    return () => {
      if (widgetRef) widgetRef.current = null;
    };
  }, [widgetRef, onExpire]);

  if (!isTurnstileEnabled()) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}
