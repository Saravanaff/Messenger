import { useEffect, useState } from "react";

export default function TestPage() {
  const [backendStatus, setBackendStatus] = useState("Testing...");
  const [frontendStatus, setFrontendStatus] = useState("OK");
  const [debugInfo, setDebugInfo] = useState({
    origin: "",
    token: false,
    user: false,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag
    setIsClient(true);

    // Test backend connection
    fetch("http://localhost:5000/api/health")
      .then((res) => res.json())
      .then((data) => {
        setBackendStatus(`✅ Backend OK: ${JSON.stringify(data)}`);
      })
      .catch((err) => {
        setBackendStatus(`❌ Backend Error: ${err.message}`);
      });

    // Get debug info (client-side only)
    setDebugInfo({
      origin: window.location.origin,
      token: !!localStorage.getItem("token"),
      user: !!localStorage.getItem("user"),
    });
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Connection Test</h1>
      <div style={{ marginTop: "20px" }}>
        <p>
          <strong>Frontend:</strong> {frontendStatus}
        </p>
        <p>
          <strong>Backend:</strong> {backendStatus}
        </p>
      </div>
      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h3>Debug Info:</h3>
        {isClient && (
          <>
            <p>Frontend URL: {debugInfo.origin}</p>
            <p>Backend URL: http://localhost:5000</p>
            <p>
              LocalStorage Token:{" "}
              {debugInfo.token ? "✅ Present" : "❌ Missing"}
            </p>
            <p>
              LocalStorage User: {debugInfo.user ? "✅ Present" : "❌ Missing"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
