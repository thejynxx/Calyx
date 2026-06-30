"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RiBookOpenLine,
  RiSettings3Line,
  RiToolsLine,
  RiFileSearchLine,
  RiDashboardLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiSparkling2Line,
  RiFileTextLine,
} from "react-icons/ri";

export default function UserGuide() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    intro: true,
    setup: false,
    rules: false,
    analyzer: false,
    remediation: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-gray-900 dark:text-gray-100 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
          Calyx Interactive Guide
        </h1>
        <p className="text-gray-500 mt-1">
          Learn how to ingest data streams, configure local pattern matching rules, and generate AI root-cause reviews.
        </p>
      </div>

      {/* Guide Main Accordion */}
      <div className="space-y-4">
        {/* Section 1: Overview */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("intro")}
            className="w-full p-5 flex items-center justify-between text-left font-bold text-base hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors border-b border-transparent data-[open=true]:border-gray-100 dark:data-[open=true]:border-stone-800"
            data-open={openSections.intro}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-lg">
                <RiBookOpenLine className="h-5 w-5" />
              </div>
              <span>What is the Standalone Calyx AIOps Engine?</span>
            </div>
            {openSections.intro ? <RiArrowUpSLine className="h-5 w-5" /> : <RiArrowDownSLine className="h-5 w-5" />}
          </button>
          
          {openSections.intro && (
            <div className="p-5 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                This application is a <strong>fully custom, lightweight Calyx AIOps panel</strong>.
                It allows software engineers and DevOps teams to ingest raw log dumps, monitor system events, and correlate alerts without the heavy database setup or external SaaS APIs of legacy platforms.
              </p>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mt-2">Core Advantages:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>No heavy legacy dependencies:</strong> We bypass original core code, Keycloak containers, Redis caches, and message systems.</li>
                <li><strong>Custom Python backend:</strong> Uses a single-file, highly optimized FastAPI server reading/writing to a local SQLite database.</li>
                <li><strong>Robust Offline Mode:</strong> If you close the backend, the entire webapp falls back to browser memory (localStorage) to test ingestion preview styles.</li>
                <li><strong>Intelligent AI:</strong> Seamlessly queries Gemini/OpenAI API directly using API keys you store privately in settings.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Section 2: Setup */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("setup")}
            className="w-full p-5 flex items-center justify-between text-left font-bold text-base hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors border-b border-transparent data-[open=true]:border-gray-100 dark:data-[open=true]:border-stone-800"
            data-open={openSections.setup}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
                <RiSettings3Line className="h-5 w-5" />
              </div>
              <span>Step 1: Setting up API Keys & Connection</span>
            </div>
            {openSections.setup ? <RiArrowUpSLine className="h-5 w-5" /> : <RiArrowDownSLine className="h-5 w-5" />}
          </button>
          
          {openSections.setup && (
            <div className="p-5 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                To generate error remedies and system suggestions, the application calls Google&apos;s <strong>Gemini API</strong>:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Go to <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-orange-500 underline font-semibold">Google AI Studio</a>.
                </li>
                <li>Create a free-tier API Key for the <strong>Gemini API</strong>.</li>
                <li>
                  Navigate to the <Link href="/aiops/settings" className="text-orange-500 underline font-semibold">Settings</Link> page of this AIOps interface.
                </li>
                <li>
                  Paste your API key in the Gemini field. Keys are persisted in your web browser&apos;s storage and never transmitted to our external databases.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Section 3: Rules */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("rules")}
            className="w-full p-5 flex items-center justify-between text-left font-bold text-base hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors border-b border-transparent data-[open=true]:border-gray-100 dark:data-[open=true]:border-stone-800"
            data-open={openSections.rules}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-lg">
                <RiToolsLine className="h-5 w-5" />
              </div>
              <span>Step 2: Defining Alert Detection Rules</span>
            </div>
            {openSections.rules ? <RiArrowUpSLine className="h-5 w-5" /> : <RiArrowDownSLine className="h-5 w-5" />}
          </button>
          
          {openSections.rules && (
            <div className="p-5 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                Alert correlation rules scan ingested log records for critical failures and generate Dashboard notifications:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Pattern Match (Regex):</strong> Fires an alert immediately if any parsed log line contains a matching substring or regular expression (e.g. <code>OOMKilled</code>, <code>ACCESS DENIED</code>).
                </li>
                <li>
                  <strong>Sliding Window (Threshold):</strong> Aggregates logs within a time window. For example: trigger a critical warning only if the pattern <code>connection refused</code> matches at least <code>5</code> times within <code>60 seconds</code>.
                </li>
              </ul>
              <p className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg border border-stone-200 dark:border-stone-800 font-mono text-xs">
                Create new alert constraints on the <Link href="/aiops/rules" className="text-orange-500 underline font-semibold">Rule Builder</Link> page.
              </p>
            </div>
          )}
        </div>

        {/* Section 4: Logs */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("analyzer")}
            className="w-full p-5 flex items-center justify-between text-left font-bold text-base hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors border-b border-transparent data-[open=true]:border-gray-100 dark:data-[open=true]:border-stone-800"
            data-open={openSections.analyzer}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-lg">
                <RiFileTextLine className="h-5 w-5" />
              </div>
              <span>Step 3: Ingesting Logs & Generating AI Insights</span>
            </div>
            {openSections.analyzer ? <RiArrowUpSLine className="h-5 w-5" /> : <RiArrowDownSLine className="h-5 w-5" />}
          </button>
          
          {openSections.analyzer && (
            <div className="p-5 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                In the <Link href="/aiops/analyzer" className="text-orange-500 underline font-semibold">Log Analyzer</Link> page:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Upload log files by dragging and dropping them into the target box, or browse files directly.</li>
                <li>
                  Our engine automatically parses JSON-formatted logs, syslog formats, and standard stack trace stamps to sort entries.
                </li>
                <li>
                  Check off specific log entries that represent a related system crash or error event.
                </li>
                <li>
                  Type a custom prompt or click <strong>Generate AI Insights</strong>.
                </li>
                <li>
                  The system forwards the records to Gemini, generating a Markdown report detailing the root cause, potential impact, and system commands (like SQL corrections or terminal fixes) to troubleshoot the crash.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Section 5: Remediation */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("remediation")}
            className="w-full p-5 flex items-center justify-between text-left font-bold text-base hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors border-b border-transparent data-[open=true]:border-gray-100 dark:data-[open=true]:border-stone-800"
            data-open={openSections.remediation}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-lg">
                <RiSparkling2Line className="h-5 w-5" />
              </div>
              <span>Step 4: Real-time Correlation in Action</span>
            </div>
            {openSections.remediation ? <RiArrowUpSLine className="h-5 w-5" /> : <RiArrowDownSLine className="h-5 w-5" />}
          </button>
          
          {openSections.remediation && (
            <div className="p-5 text-sm text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                When alerts trigger, they populate the <Link href="/aiops/dashboard" className="text-orange-500 underline font-semibold">Dashboard</Link>.
              </p>
              <p>
                Each alert row contains a direct shortcut button: <strong>Analyze Logs</strong>.
                Clicking this button takes you to the Log Analyzer page with the exact log segment pre-selected, allowing you to get immediate AI help in one click!
              </p>
              <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/35">
                <h4 className="font-bold flex items-center space-x-1">
                  <span>🚀 Pro Tip:</span>
                </h4>
                <p className="mt-1 text-xs">
                  Create rules for standard keywords like <code>FATAL</code> or <code>CRITICAL</code>, and let the engine identify the exact time window Pods restarted or connections dropped so you spend less time debugging raw console lines.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
