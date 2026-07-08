"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RiDashboardLine,
  RiAlertLine,
  RiFileTextLine,
  RiDeleteBin7Line,
  RiRefreshLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiSettings3Line,
} from "react-icons/ri";

interface Alert {
  id: number | string;
  rule_name: string;
  severity: string;
  message: string;
  timestamp: string;
  log_snippet?: string;
  status: string;
}

interface LogEntry {
  id: number;
  timestamp: string;
  severity: string;
  message: string;
  service: string;
}

interface Rule {
  id: number;
  name: string;
}

export default function CalyxDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logsCount, setLogsCount] = useState<number>(0);
  const [rulesCount, setRulesCount] = useState<number>(0);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
    activeCount: 0,
  });

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Check health
      const healthRes = await fetch("http://localhost:8080/health");
      if (!healthRes.ok) throw new Error("Offline");
      setBackendOnline(true);

      // 2. Fetch Alerts
      const alertsRes = await fetch("http://localhost:8080/api/alerts");
      const alertsData = await alertsRes.json();
      setAlerts(alertsData);

      // Calc Alert stats
      let critical = 0;
      let warning = 0;
      let info = 0;
      let active = 0;
      alertsData.forEach((a: Alert) => {
        if (a.severity === "CRITICAL") critical++;
        else if (a.severity === "WARNING" || a.severity === "WARN") warning++;
        else info++;

        if (a.status === "active") active++;
      });
      setStats({
        criticalCount: critical,
        warningCount: warning,
        infoCount: info,
        activeCount: active,
      });

      // 3. Fetch Logs Count
      const logsRes = await fetch("http://localhost:8080/api/logs?limit=5000");
      const logsData = await logsRes.json();
      setLogsCount(logsData.length);

      // 4. Fetch Rules Count
      const rulesRes = await fetch("http://localhost:8080/api/rules");
      const rulesData = await rulesRes.json();
      setRulesCount(rulesData.length);

    } catch (error) {
      setBackendOnline(false);
      // Mock data fallback if backend is offline, for pure UI previewing
      const mockAlerts = [
        {
          id: 1,
          rule_name: "DB connection failures",
          severity: "CRITICAL",
          message: "Threshold exceeded! Found 5 logs matching 'connection refused' within a 60s window.",
          timestamp: new Date().toISOString(),
          log_snippet: "pg_connect(): postgresql://postgres:***@db:5432/main failed (Connection refused)",
          status: "active"
        },
        {
          id: 2,
          rule_name: "Auth brute force",
          severity: "WARNING",
          message: "Pattern 'Failed password' matched log message: Failed password for root from 192.168.1.105...",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          log_snippet: "Jun 30 00:15:32 auth sshd[10292]: Failed password for root from 192.168.1.105 port 49232 ssh2",
          status: "active"
        }
      ];
      setAlerts(mockAlerts);
      setStats({
        criticalCount: 1,
        warningCount: 1,
        infoCount: 0,
        activeCount: 2,
      });
      setLogsCount(158);
      setRulesCount(4);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const updateAlertStatus = async (id: number | string, status: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      // Mock update for offline mode
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  };

  const clearAlerts = async () => {
    if (!confirm("Are you sure you want to clear all active alerts?")) return;
    try {
      const response = await fetch("http://localhost:8080/api/alerts", {
        method: "DELETE"
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      setAlerts([]);
      setStats({ criticalCount: 0, warningCount: 0, infoCount: 0, activeCount: 0 });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            Calyx AIOps Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time analytics, local alert correlation, and smart root cause analysis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-1.5 px-4 py-2 bg-stone-200/70 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 font-medium rounded-lg text-sm transition-all"
          >
            <RiRefreshLine className="h-4 w-4 animate-spin-hover" />
            <span>Reload</span>
          </button>
          
          <Link
            href="/aiops/settings"
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg text-sm shadow-md hover:shadow-lg transition-all"
          >
            <RiSettings3Line className="h-4 w-4" />
            <span>Configure Engine</span>
          </Link>
        </div>
      </div>

      {/* Backend Status Notice */}
      {backendOnline === false && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start space-x-3">
          <RiAlertLine className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-800">Calyx Backend Offline</h3>
            <p className="text-amber-700 text-sm">
              The custom backend engine is not running at <code>http://localhost:8080</code>.
              To get active database logic, upload datasets, and trigger live logs: start your backend server using 
              <code> cd aiops_backend && uvicorn main:app --reload --port 8080</code>. Displaying demo fallback data below.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-200 dark:border-stone-800 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-orange-100 dark:bg-orange-950/40 text-orange-500 rounded-xl">
            <RiFileTextLine className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Logs Processed</p>
            <h3 className="text-2xl font-bold mt-0.5">{logsCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-200 dark:border-stone-800 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-red-100 dark:bg-red-950/40 text-red-500 rounded-xl">
            <RiAlertLine className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Critical Alerts</p>
            <h3 className="text-2xl font-bold mt-0.5 text-red-500">{stats.criticalCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-200 dark:border-stone-800 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-100 dark:bg-amber-950/40 text-amber-500 rounded-xl">
            <RiAlertLine className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Warnings Ingested</p>
            <h3 className="text-2xl font-bold mt-0.5 text-amber-500">{stats.warningCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-gray-200 dark:border-stone-800 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
            <RiCheckboxCircleLine className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Engine Status</p>
            <h3 className="text-2xl font-bold mt-0.5 text-emerald-500">
              {backendOnline === true ? "ACTIVE" : "STANDALONE"}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Alerts & Activity */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RiAlertLine className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-bold">Correlated Active Alerts</h2>
            </div>
            {alerts.length > 0 && (
              <button
                onClick={clearAlerts}
                className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-600 font-semibold transition-colors"
              >
                <RiDeleteBin7Line className="h-3.5 w-3.5" />
                <span>Clear All Alerts</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {alerts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <RiCheckboxCircleLine className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">All systems operational</p>
                <p className="text-sm mt-1">No alerts triggered yet. Ingest a dataset in the <Link href="/aiops/analyzer" className="text-orange-500 hover:underline">Log Analyzer</Link> to test.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-stone-800/40 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-stone-800">
                    <th className="py-3 px-5">Rule Name</th>
                    <th className="py-3 px-5">Severity</th>
                    <th className="py-3 px-5">Message</th>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-stone-800/20 transition-colors"
                    >
                      <td className="py-4 px-5 font-semibold text-sm max-w-[150px] truncate">
                        {alert.rule_name}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            alert.severity === "CRITICAL"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : alert.severity === "WARNING"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm max-w-[280px]">
                        <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                          {alert.message}
                        </p>
                        {alert.log_snippet && (
                          <pre className="mt-1 text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 p-1.5 rounded overflow-x-auto max-w-full font-mono">
                            {alert.log_snippet}
                          </pre>
                        )}
                      </td>
                      <td className="py-4 px-5 text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 text-xs">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                            alert.status === "active"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-500"
                              : alert.status === "acknowledged"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-500"
                              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-500"
                          }`}
                        >
                          {(alert.status || "active").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        {alert.status === "active" && (
                          <button
                            onClick={() => updateAlertStatus(alert.id, "acknowledged")}
                            className="text-xs font-semibold px-2 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 transition-colors"
                          >
                            Ack
                          </button>
                        )}
                        {alert.status !== "resolved" && (
                          <button
                            onClick={() => updateAlertStatus(alert.id, "resolved")}
                            className="text-xs font-semibold px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        <Link
                          href={`/aiops/analyzer?logs=${encodeURIComponent(alert.log_snippet || alert.message)}`}
                          className="inline-block text-xs font-bold px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                        >
                          Analyze Logs
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
