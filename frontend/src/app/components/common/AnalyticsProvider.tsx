import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../../utils/analytics";
import {
  COOKIE_CONSENT_EVENT,
  hasCookieConsent,
} from "../../../utils/cookieConsent";

const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let scriptsInjected = false;

function injectAnalyticsScripts() {
  if (scriptsInjected || typeof document === "undefined") return;
  scriptsInjected = true;

  if (GA4_ID) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(gtagScript);

    const inline = document.createElement("script");
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA4_ID}');
    `;
    document.head.appendChild(inline);
  }

  if (CLARITY_ID) {
    const clarity = document.createElement("script");
    clarity.textContent = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");
    `;
    document.head.appendChild(clarity);
  }

  if (META_PIXEL_ID) {
    const meta = document.createElement("script");
    meta.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window,document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(meta);

    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" />`;
    document.body.appendChild(noscript);
  }
}

function AnalyticsPageTracker() {
  const location = useLocation();
  const [consentGranted, setConsentGranted] = useState(hasCookieConsent);

  useEffect(() => {
    const syncConsent = () => setConsentGranted(hasCookieConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, syncConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (!consentGranted) return;
    injectAnalyticsScripts();
  }, [consentGranted]);

  useEffect(() => {
    if (!consentGranted) return;
    trackPageView(location.pathname + location.search);
  }, [consentGranted, location.pathname, location.search]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsPageTracker />
      {children}
    </>
  );
}
