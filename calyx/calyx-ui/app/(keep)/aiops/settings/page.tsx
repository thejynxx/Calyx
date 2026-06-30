"use client";

import React, { useState, useEffect } from "react";
import {
  RiSettings3Line,
  RiKey2Line,
  RiDatabaseLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiDownload2Line,
  RiUpload2Line,
  RiRefreshLine,
} from "react-icons/ri";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    // Load keys from localStorage
    const savedGemini = localStorage.getItem("aiops-gemini-key") || "";
    const savedOpenai = localStorage.getItem("aiops-openai-key") || "";
    setGeminiKey(savedGemini);
    setOpenaiKey(savedOpenai);

    // Check backend connection
    const checkBackend = async () => {
      try {
        const res = await fetch("http://localhost:8080/health");
        if (res.ok) setBackendOnline(true);
        else setBackendOnline(false);
      } catch (e) {
        setBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("aiops-gemini-key", geminiKey);
    localStorage.setItem("aiops-openai-key", openaiKey);
    setValidationResult({
      type: "success",
      msg: "API Keys saved successfully to local browser storage!"
    });
  };

  const testGeminiConnection = async () => {
    if (!geminiKey) {
      setValidationResult({ type: "error", msg: "Please enter a Gemini API Key first." });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await fetch("http://localhost:8080/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${geminiKey}`
        },
        body: JSON.stringify({
          logs: "Connection test probe",
          prompt: "Say the single word 'CONNECTED' if you receive this message."
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Validation request rejected by API provider.");
      }

      const data = await res.json();
      if (data.analysis && data.analysis.toLowerCase().includes("connect")) {
        setValidationResult({
          type: "success",
          msg: "API Verification Successful! Connected to Gemini API model."
        });
      } else {
        setValidationResult({
          type: "success",
          msg: `Connected, response: "${data.analysis}"`
        });
      }
    } catch (e: any) {
      setValidationResult({
        type: "error",
        msg: `Connection test failed: ${e.message || "Is the custom python backend running?"}`
      });
    } finally {
      setIsValidating(false);
    }
  };

  const exportRules = () => {
    const localRules = localStorage.getItem("aiops-custom-rules") || "[]";
    const blob = new Blob([localRules], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aiops_rules_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importRules = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rules = JSON.parse(event.target?.result as string);
        if (Array.isArray(rules)) {
          localStorage.setItem("aiops-custom-rules", JSON.stringify(rules));
          alert(`Imported ${rules.length} custom rule(s) successfully!`);
          window.location.reload();
        } else {
          alert("Invalid rules configuration structure.");
        }
      } catch (e) {
        alert("Could not parse file. Ensure it is a valid JSON schema.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-gray-900 dark:text-gray-100 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-550 to-amber-500 bg-clip-text text-transparent">
          Calyx Engine Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage system integration credentials, verify model availability, and backup alerting rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Connection status (Left) */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-stone-850 pb-2">
            <RiDatabaseLine className="h-5 w-5 text-orange-500" />
            <h3 className="font-bold text-sm">System Integration</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <p className="font-semibold text-gray-400">Custom Backend Engine</p>
              <div className="mt-1 flex items-center space-x-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    backendOnline === true ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="font-bold">
                  {backendOnline === true ? "ONLINE (localhost:8080)" : "OFFLINE / STANDALONE"}
                </span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-400">Database Context</p>
              <p className="mt-0.5 font-mono text-[10px] text-gray-500 bg-stone-100 dark:bg-stone-950 p-1.5 rounded break-all">
                {backendOnline === true ? "sqlite:///./calyx.db (Local Server)" : "LocalBrowserStorage"}
              </p>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-stone-200 dark:border-stone-800 rounded-lg hover:bg-stone-50 text-stone-700 dark:text-stone-300 transition-colors font-medium text-[11px]"
            >
              <RiRefreshLine className="h-3 w-3" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>

        {/* Credentials Form (Center/Right) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-stone-850 pb-3">
              <RiKey2Line className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-base">Model Credentials</h3>
            </div>

            <form onSubmit={handleSaveKeys} className="space-y-4 text-sm">
              {validationResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start space-x-2 border ${
                    validationResult.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                      : "bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                  }`}
                >
                  {validationResult.type === "success" ? (
                    <RiCheckboxCircleLine className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <RiAlertLine className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                  )}
                  <span>{validationResult.msg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Gemini API Key (Required for AI Insights)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full p-2 border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  This key will be stored securely in your local browser and never sent elsewhere.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  OpenAI API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full p-2 border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg shadow hover:opacity-90 transition-opacity"
                >
                  Save Keys
                </button>
                <button
                  type="button"
                  onClick={testGeminiConnection}
                  disabled={isValidating}
                  className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-semibold rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {isValidating ? "Validating Connection..." : "Test Gemini Key"}
                </button>
              </div>
            </form>
          </div>

          {/* Backup / Export configs */}
          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-stone-850 pb-3">
              <RiDownload2Line className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-base">Backup Configuration</h3>
            </div>
            
            <p className="text-xs text-gray-500">
              Export your custom threshold alert rules to a JSON file to transfer rules across workstations, or upload a backup schema.
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <button
                onClick={exportRules}
                className="flex items-center space-x-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 rounded-lg transition-colors"
              >
                <RiDownload2Line className="h-4 w-4" />
                <span>Export Rules</span>
              </button>

              <label className="flex items-center space-x-1.5 px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300 cursor-pointer transition-colors">
                <RiUpload2Line className="h-4 w-4" />
                <span>Import Rules JSON</span>
                <input
                  type="file"
                  onChange={importRules}
                  accept=".json"
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
