"use client";
import { useState } from "react";
import {
  getCurrentEthiopianDate,
  formatEthiopianDate,
  getTodayEthiopianDateString,
  getTodayEthiopianDateISO,
  testEthiopianCalendar,
} from "@/lib/utils";

interface TestResult {
  message: string;
  results: {
    gregorian: string;
    ethiopian: string;
    expected: string;
    passed: boolean;
  }[];
}

export default function TestEthiopianCalendar() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const runTest = () => {
    const result = testEthiopianCalendar();
    setTestResult(result);
  };

  const today = new Date();
  const ethiopianToday = getCurrentEthiopianDate();
  const formattedToday = formatEthiopianDate(today);
  const todayString = getTodayEthiopianDateString();
  const todayISO = getTodayEthiopianDateISO();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Ethiopian Calendar Test</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Date Information</h2>
        <div className="space-y-2">
          <p>
            <strong>Gregorian Date:</strong> {today.toISOString()}
          </p>
          <p>
            <strong>Ethiopian Date Object:</strong>{" "}
            {JSON.stringify(ethiopianToday)}
          </p>
          <p>
            <strong>Formatted Ethiopian Date:</strong> {formattedToday}
          </p>
          <p>
            <strong>Today String (Amharic):</strong> {todayString}
          </p>
          <p>
            <strong>Today ISO Format:</strong> {todayISO}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Different Formats</h2>
        <div className="space-y-2">
          <p>
            <strong>English Format:</strong>{" "}
            {formatEthiopianDate(today, { language: "en" })}
          </p>
          <p>
            <strong>Amharic Format:</strong>{" "}
            {formatEthiopianDate(today, { language: "am" })}
          </p>
          <p>
            <strong>Abbreviated Format:</strong>{" "}
            {formatEthiopianDate(today, { format: "abbreviated" })}
          </p>
          <p>
            <strong>Short Format:</strong>{" "}
            {formatEthiopianDate(today, { format: "short" })}
          </p>
          <p>
            <strong>Without Year:</strong>{" "}
            {formatEthiopianDate(today, { includeYear: false })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <button
          onClick={runTest}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
        >
          Run Test
        </button>

        {testResult && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Test Output:</h3>
            <pre className="text-sm">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
