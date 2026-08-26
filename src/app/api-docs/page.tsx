"use client";

import { useEffect, useRef, useState } from "react";

const SWAGGER_CDN = "https://unpkg.com/swagger-ui-dist@5.17.14";

/**
 * Swagger UI viewer for the API spec served from /openapi.json.
 * Loaded from the swagger-ui-dist CDN to avoid React 19 peer-dependency
 * conflicts with the swagger-ui-react package.
 */
export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cssId = "swagger-ui-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = `${SWAGGER_CDN}/swagger-ui.css`;
      document.head.appendChild(link);
    }

    const init = () => {
      const SwaggerUIBundle = (
        window as unknown as {
          SwaggerUIBundle?: (options: Record<string, unknown>) => void;
        }
      ).SwaggerUIBundle;
      if (!SwaggerUIBundle || !containerRef.current) return;
      SwaggerUIBundle({
        domNode: containerRef.current,
        url: "/openapi.json",
        deepLinking: true,
        docExpansion: "none",
        filter: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
      });
    };

    let script: HTMLScriptElement | null = document.querySelector(
      `script[src="${SWAGGER_CDN}/swagger-ui-bundle.js"]`,
    );
    if (!script) {
      script = document.createElement("script");
      script.src = `${SWAGGER_CDN}/swagger-ui-bundle.js`;
      script.crossOrigin = "anonymous";
      script.onload = init;
      script.onerror = () =>
        setError("Failed to load Swagger UI from CDN. Check your connection.");
      document.body.appendChild(script);
    } else {
      // Script already loaded (e.g. Fast Refresh remount)
      init();
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Birhane Hiwot Sunday School — API Documentation
        </h1>
        <p className="text-sm text-slate-500">
          Spec:{" "}
          <a className="underline" href="/openapi.json" target="_blank" rel="noreferrer">
            /openapi.json
          </a>{" "}
          · Login first via the Auth → credentials callback endpoints to test
          role-protected routes.
        </p>
      </header>
      {error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  );
}
