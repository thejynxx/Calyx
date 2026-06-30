"use client";

import React, { useState, useEffect } from "react";
import {
  RiListSettingsLine,
  RiAddLine,
  RiDeleteBin7Line,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiToolsLine,
} from "react-icons/ri";

interface Rule {
  id: number;
  name: string;
  type: string;
  pattern: string;
  threshold_count: number;
  threshold_window_seconds: number;
  severity: string;
  is_active: boolean;
}

export default function RuleBuilder() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("regex"); // regex, threshold
  const [pattern, setPattern] = useState("");
  const [thresholdCount, setThresholdCount] = useState(3);
  const [thresholdWindow, setThresholdWindow] = useState(60);
  const [severity, setSeverity] = useState("WARNING");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/rules");
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      setRules(data);
      setBackendOnline(true);
    } catch (e) {
      setBackendOnline(false);
      // Fallback: LocalStorage rules
      const localRules = localStorage.getItem("aiops-custom-rules");
      if (localRules) {
        setRules(JSON.parse(localRules));
      } else {
        const defaultRules = [
          {
            id: 1,
            name: "Database connection refusions",
            type: "threshold",
            pattern: "connection refused",
            threshold_count: 5,
            threshold_window_seconds: 60,
            severity: "CRITICAL",
            is_active: true
          },
          {
            id: 2,
            name: "Brute SSH failure logs",
            type: "regex",
            pattern: "Failed password for",
            threshold_count: 1,
            threshold_window_seconds: 60,
            severity: "WARNING",
            is_active: true
          },
          {
            id: 3,
            name: "Kubernetes OOMKilled pods",
            type: "regex",
            pattern: "OOMKilled",
            threshold_count: 1,
            threshold_window_seconds: 60,
            severity: "CRITICAL",
            is_active: true
          }
        ];
        setRules(defaultRules);
        localStorage.setItem("aiops-custom-rules", JSON.stringify(defaultRules));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!ruleName.trim()) {
      setFormError("Rule name is required.");
      return;
    }
    if (!pattern.trim()) {
      setFormError("Matching pattern or regex string is required.");
      return;
    }

    const payload = {
      name: ruleName,
      type: ruleType,
      pattern: pattern,
      threshold_count: ruleType === "threshold" ? thresholdCount : 1,
      threshold_window_seconds: ruleType === "threshold" ? thresholdWindow : 60,
      severity: severity,
    };

    try {
      if (backendOnline === true) {
        const res = await fetch("http://localhost:8080/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Failed to create rule");
        }

        setFormSuccess("Rule successfully registered in the backend!");
      } else {
        // Offline client mode logic
        const newRule: Rule = {
          id: Date.now(),
          name: ruleName,
          type: ruleType,
          pattern: pattern,
          threshold_count: ruleType === "threshold" ? thresholdCount : 1,
          threshold_window_seconds: ruleType === "threshold" ? thresholdWindow : 60,
          severity: severity,
          is_active: true
        };

        const updatedRules = [...rules, newRule];
        setRules(updatedRules);
        localStorage.setItem("aiops-custom-rules", JSON.stringify(updatedRules));
        setFormSuccess("Rule saved locally in Browser (Engine offline)!");
      }

      // Reset Form fields
      setRuleName("");
      setPattern("");
      fetchRules();
    } catch (e: any) {
      setFormError(e.message || "Rule creation failed.");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this custom alert rule?")) return;
    try {
      if (backendOnline === true) {
        const res = await fetch(`http://localhost:8080/api/rules/${id}`, {
          method: "DELETE"
        });
        if (res.ok) fetchRules();
      } else {
        const updatedRules = rules.filter(r => r.id !== id);
        setRules(updatedRules);
        localStorage.setItem("aiops-custom-rules", JSON.stringify(updatedRules));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-900 dark:text-gray-100 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
          Calyx Custom Rule Builder
        </h1>
        <p className="text-gray-500 mt-1">
          Create threshold-based alerts or pattern matching rules to process uploaded dataset streams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form to Add Rule (1/3 width) */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-stone-850 pb-3">
            <RiToolsLine className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">New Rule Parameters</h2>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4 text-sm">
            {formError && (
              <div className="p-3 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 text-xs rounded-lg flex items-start space-x-2">
                <RiAlertLine className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 text-xs rounded-lg flex items-start space-x-2">
                <RiCheckboxCircleLine className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Rule Name
              </label>
              <input
                type="text"
                placeholder="e.g. Memory Leak Checker"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Trigger Method
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
              >
                <option value="regex">Pattern Match (Regex)</option>
                <option value="threshold">Sliding Window (Threshold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Match Keyword / Pattern
              </label>
              <input
                type="text"
                placeholder="e.g. Out of Memory, Timeout, ERROR"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-mono"
              />
            </div>

            {ruleType === "threshold" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 dark:bg-stone-950/40 border border-stone-100 dark:border-stone-850 rounded-xl">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Error Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={thresholdCount}
                    onChange={(e) => setThresholdCount(parseInt(e.target.value))}
                    className="w-full p-1.5 border border-gray-200 dark:border-stone-800 bg-white dark:bg-stone-950 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Window (sec)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={thresholdWindow}
                    onChange={(e) => setThresholdWindow(parseInt(e.target.value))}
                    className="w-full p-1.5 border border-gray-200 dark:border-stone-800 bg-white dark:bg-stone-950 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
              >
                <option value="INFO">INFO (Normal status)</option>
                <option value="WARNING">WARNING (Review required)</option>
                <option value="CRITICAL">CRITICAL (System Failure)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-1"
            >
              <RiAddLine className="h-4 w-4" />
              <span>Create Rule</span>
            </button>
          </form>
        </div>

        {/* Existing Rules List (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RiListSettingsLine className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-bold">Active Engine Rules</h2>
            </div>
            <span className="text-xs text-gray-500">
              {rules.length} custom alert definitions
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-stone-800">
            {rules.length === 0 ? (
              <div className="p-16 text-center text-gray-500">
                <RiListSettingsLine className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-bold">No active rules defined</p>
                <p className="text-xs mt-1">Configure your first rule in the left panel to scan logs.</p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        {rule.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          rule.severity === "CRITICAL"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : rule.severity === "WARNING"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-mono">
                      <div>
                        <span className="font-sans font-semibold text-gray-400">Trigger:</span>{" "}
                        <span className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-stone-700 dark:text-stone-300">
                          {rule.type.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-gray-400">Query:</span>{" "}
                        <code className="text-orange-500 font-bold">{rule.pattern}</code>
                      </div>
                      {rule.type === "threshold" && (
                        <div>
                          <span className="font-sans font-semibold text-gray-400">Threshold:</span>{" "}
                          <span>
                            &gt;= {rule.threshold_count} matches in {rule.threshold_window_seconds}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center space-x-3 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 border border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors"
                      title="Delete Rule"
                    >
                      <RiDeleteBin7Line className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-stone-900 border-t border-gray-200 dark:border-stone-800 text-xs text-gray-500 flex items-start space-x-2">
            <RiInformationLine className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              When a log file is ingested, the engine iterates over each rule definition sequentially.
              Threshold rules run sliding-window calculations across dates parsed from log records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
