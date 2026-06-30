"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  RiUploadCloud2Line,
  RiFileTextLine,
  RiSearchLine,
  RiDeleteBin7Line,
  RiSparkling2Line,
  RiCheckDoubleLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiAlertLine,
  RiInformationLine,
  RiCheckboxCircleLine,
  RiFileWarningLine,
} from "react-icons/ri";
import { MarkdownHTML } from "@/shared/ui/MarkdownHTML/MarkdownHTML";

interface LogEntry {
  id: number;
  timestamp: string;
  severity: string;
  message: string;
  service: string;
  raw: string;
}

export default function LogAnalyzer() {
  const searchParams = useSearchParams();
  
  // State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load logs on mount
  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/logs?limit=500");
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      setLogs(data);
      setBackendOnline(true);
    } catch (e) {
      setBackendOnline(false);
      // Fallback logs
      const mockLogs = [
        {
          id: 101,
          timestamp: new Date().toISOString(),
          severity: "CRITICAL",
          service: "db-pool",
          message: "postgresql://postgres:***@db:5432/main failed (Connection refused)",
          raw: `[${new Date().toISOString()}] [db-pool] [CRITICAL] postgresql://postgres:***@db:5432/main failed (Connection refused)`
        },
        {
          id: 102,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          severity: "ERROR",
          service: "auth-service",
          message: "Failed password for root from 192.168.1.105 port 49232 ssh2",
          raw: `[${new Date(Date.now() - 60000).toISOString()}] [auth-service] [ERROR] Failed password for root from 192.168.1.105 port 49232 ssh2`
        },
        {
          id: 103,
          timestamp: new Date(Date.now() - 120000).toISOString(),
          severity: "WARNING",
          service: "gateway",
          message: "Slow request detected: GET /api/v1/users (took 1420ms)",
          raw: `[${new Date(Date.now() - 120000).toISOString()}] [gateway] [WARNING] Slow request detected: GET /api/v1/users (took 1420ms)`
        },
        {
          id: 104,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          severity: "INFO",
          service: "auth-service",
          message: "Token generated for user: admin@calyx.local",
          raw: `[${new Date(Date.now() - 300000).toISOString()}] [auth-service] [INFO] Token generated for user: admin@calyx.local`
        }
      ];
      setLogs(mockLogs);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Check if redirect query has logs
    const urlLogs = searchParams.get("logs");
    if (urlLogs) {
      setCustomPrompt("Perform a detailed root cause analysis on these error details.");
      // Render analysis directly or open panel
      setAiAnalysis(`### selected Log Segment to Analyze:\n\`\`\`\n${urlLogs}\n\`\`\`\n\n*(Click 'Generate AI Insights' below to analyze this log using Gemini AI)*`);
    }
  }, [searchParams]);

  // File Ingestion Handles
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Ingestion failed");
      }

      const result = await res.json();
      setUploadStatus({
        type: "success",
        msg: `Successfully parsed ${result.lines_processed} lines! Ingested ${result.lines_ingested} records and triggered ${result.alerts_triggered} alert(s).`
      });
      fetchLogs();
    } catch (e: any) {
      setUploadStatus({
        type: "error",
        msg: e.message || "Could not connect to the backend server. Logs parsed in preview mode only."
      });
      // Parse client-side for immediate demo if backend is offline
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        const previewLogs: LogEntry[] = lines.slice(0, 50).map((line, idx) => {
          const sev = line.toLowerCase().includes("error") ? "ERROR" : line.toLowerCase().includes("warn") ? "WARNING" : "INFO";
          return {
            id: 200 + idx,
            timestamp: new Date().toISOString(),
            severity: sev,
            service: "preview-file",
            message: line.substring(0, 300),
            raw: line
          };
        }).filter(l => l.raw.trim().length > 0);
        setLogs(previewLogs);
      };
      reader.readAsText(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Clear Logs
  const clearLogs = async () => {
    if (!confirm("Are you sure you want to clear all parsed log records?")) return;
    try {
      const res = await fetch("http://localhost:8080/api/logs", {
        method: "DELETE"
      });
      if (res.ok) fetchLogs();
    } catch (e) {
      setLogs([]);
    }
  };

  // AI Analysis trigger
  const runAiAnalysis = async () => {
    setAiError(null);
    setIsAnalyzing(true);

    const apiKey = localStorage.getItem("aiops-gemini-key") || "";
    if (!apiKey) {
      setAiError("No API Key found. Go to the Settings page to configure your free-tier Gemini API key first.");
      setIsAnalyzing(false);
      return;
    }

    // Combine selected logs text
    let logText = "";
    if (selectedLogs.length > 0) {
      logText = logs
        .filter(l => selectedLogs.includes(l.id))
        .map(l => `[${l.timestamp}] [${l.service}] [${l.severity}] ${l.message}`)
        .join("\n");
    } else {
      // Fallback to URL query or top 5 logs
      const urlLogs = searchParams.get("logs");
      if (urlLogs) {
        logText = urlLogs;
      } else {
        logText = logs.slice(0, 5).map(l => l.raw).join("\n");
      }
    }

    try {
      const res = await fetch("http://localhost:8080/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          logs: logText,
          prompt: customPrompt || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Analysis request failed");
      }

      const result = await res.json();
      setAiAnalysis(result.analysis);
    } catch (e: any) {
      setAiError(e.message || "Failed to analyze logs with Gemini.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Log Selection toggles
  const toggleSelectLog = (id: number) => {
    setSelectedLogs(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredLogs();
    const allFilteredIds = filtered.map(l => l.id);
    const areAllSelected = allFilteredIds.every(id => selectedLogs.includes(id));

    if (areAllSelected) {
      setSelectedLogs(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedLogs(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Log filtering algorithm
  const getFilteredLogs = () => {
    return logs.filter((log) => {
      const matchSeverity = selectedSeverity === "ALL" || log.severity === selectedSeverity;
      const matchSearch =
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.raw.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSeverity && matchSearch;
    });
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
          Calyx Log & Dataset Analyzer
        </h1>
        <p className="text-gray-500 mt-1">
          Upload system logs or CSV tables to match local filters or analyze anomalies using Gemini AI.
        </p>
      </div>

      {/* Grid: 2-Column layout - Log table & AI Analysis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Ingestion & Log Viewer (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-stone-850 hover:border-orange-500 dark:hover:border-orange-500 bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              accept=".log,.txt,.csv,.json"
            />
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-full">
              <RiUploadCloud2Line className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-200">
                Drag and drop your log file here, or <span className="text-orange-500">browse files</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports Standard Syslogs, CSV datasets, JSON logging, or application stack traces (.log, .csv, .json, .txt)
              </p>
            </div>
            {isUploading && (
              <span className="text-xs text-orange-500 font-semibold animate-pulse">
                Parsing and applying active filters...
              </span>
            )}
          </div>

          {/* Upload Status Alert */}
          {uploadStatus && (
            <div
              className={`p-4 rounded-xl shadow-sm flex items-start space-x-3 text-sm ${
                uploadStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400"
              }`}
            >
              {uploadStatus.type === "success" ? (
                <RiCheckboxCircleLine className="h-5 w-5 text-emerald-500 mt-0.5" />
              ) : (
                <RiAlertLine className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">
                  {uploadStatus.type === "success" ? "Ingestion Completed" : "Ingestion Warning"}
                </p>
                <p className="mt-0.5">{uploadStatus.msg}</p>
              </div>
              <button onClick={() => setUploadStatus(null)} className="text-gray-400 hover:text-gray-500">
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Log Table Controls */}
          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <RiSearchLine className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs by message, service, or contents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-3">
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                >
                  <option value="ALL">All Severities</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="ERROR">ERROR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>

                {logs.length > 0 && (
                  <button
                    onClick={clearLogs}
                    className="flex items-center space-x-1.5 px-3 py-2 border border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 text-sm rounded-lg transition-colors font-medium"
                  >
                    <RiDeleteBin7Line className="h-4 w-4" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ingested log table */}
            <div className="overflow-x-auto max-h-[500px]">
              {filteredLogs.length === 0 ? (
                <div className="p-16 text-center text-gray-500">
                  <RiFileWarningLine className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="font-bold text-gray-700 dark:text-gray-300">No matching log records found</p>
                  <p className="text-xs mt-1">
                    Try altering your search string, severity filter, or drag-and-drop a new log file to parse.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-stone-800/40 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-stone-800">
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredLogs.length > 0 &&
                            filteredLogs.every((l) => selectedLogs.includes(l.id))
                          }
                          onChange={selectAllFiltered}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 w-28">Timestamp</th>
                      <th className="py-3 px-4 w-20">Severity</th>
                      <th className="py-3 px-4 w-28">Service</th>
                      <th className="py-3 px-4">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-stone-850">
                    {filteredLogs.map((log) => {
                      const isSelected = selectedLogs.includes(log.id);
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-orange-50/10 dark:hover:bg-orange-950/5 cursor-pointer transition-colors ${
                            isSelected ? "bg-orange-50/20 dark:bg-orange-950/10" : ""
                          }`}
                          onClick={() => toggleSelectLog(log.id)}
                        >
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectLog(log.id)}
                              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.severity === "CRITICAL"
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                  : log.severity === "ERROR"
                                  ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                                  : log.severity === "WARNING"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-400"
                              }`}
                            >
                              {log.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 max-w-[110px] truncate">
                            {log.service}
                          </td>
                          <td className="py-3 px-4 text-gray-800 dark:text-gray-200 break-all select-all font-mono">
                            {log.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-stone-900 border-t border-gray-200 dark:border-stone-800 text-xs text-gray-500 flex justify-between items-center">
              <span>
                Showing {filteredLogs.length} of {logs.length} parsed records
              </span>
              {selectedLogs.length > 0 && (
                <span className="text-orange-500 font-semibold animate-pulse">
                  {selectedLogs.length} record(s) selected for AI analysis
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI Control Center Side-Panel (1/3 width) */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-stone-850 pb-3">
            <RiSparkling2Line className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">Calyx AI Insights</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Custom Prompt Instruction (Optional)
              </label>
              <textarea
                placeholder="Ask Gemini to find database locks, explain stack trace errors, write repair scripts, or check warning trends..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-sans"
              />
            </div>

            <button
              onClick={runAiAnalysis}
              disabled={isAnalyzing}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RiSparkling2Line className="h-4 w-4 animate-pulse" />
              <span>{isAnalyzing ? "Querying Gemini API..." : "Generate AI Insights"}</span>
            </button>
          </div>

          {/* AI Response Block */}
          {aiError && (
            <div className="p-3 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-900/30 flex items-start space-x-2">
              <RiAlertLine className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-2 border-t border-gray-100 dark:border-stone-850 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Analysis Report
                </span>
                <button
                  onClick={() => setAiAnalysis(null)}
                  className="text-xs text-gray-400 hover:text-gray-500"
                >
                  Clear Results
                </button>
              </div>
              <div className="bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-850 p-4 rounded-xl overflow-y-auto max-h-[400px] text-xs leading-relaxed prose dark:prose-invert max-w-none shadow-inner select-text">
                <MarkdownHTML>{aiAnalysis}</MarkdownHTML>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
