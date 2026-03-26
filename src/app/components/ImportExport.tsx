import { useState } from "react";
import { Download, Upload, AlertCircle, CheckCircle, Info, Edit2 } from "lucide-react";
import {
  exportRecordsToJSON,
  importRecordsFromJSON,
  getMachineId,
  setMachineId,
  type MergeResult,
} from "../mergeRecords";

export function ImportExport() {
  const [importResult, setImportResult] = useState<MergeResult | null>(null);
  const [machineId, setMachineIdState] = useState(getMachineId());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(machineId);

  const handleExport = () => {
    const json = exportRecordsToJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moa-records-${machineId}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importRecordsFromJSON(content);
      setImportResult(result);
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset input
  };

  const handleEditMachineId = () => {
    setIsEditing(true);
    setEditValue(machineId);
  };

  const handleSaveMachineId = () => {
    const cleanValue = editValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (cleanValue.length < 2) {
      alert('Machine ID must be at least 2 characters (letters and numbers only)');
      return;
    }
    
    if (cleanValue.length > 10) {
      alert('Machine ID must be 10 characters or less');
      return;
    }

    if (setMachineId(cleanValue)) {
      setMachineIdState(cleanValue);
      setIsEditing(false);
      alert('Machine ID updated! New records will use: MOA-2026-' + cleanValue + '-001');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(machineId);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
          Import / Export Records
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Share records between different computers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* Machine Info */}
        <div className="lg:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Machine ID: {machineId}
                </h3>
                {!isEditing && (
                  <button
                    onClick={handleEditMachineId}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    title="Change Machine ID"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g., OFFICE1, BRANCH2, ADMIN"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveMachineId}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-1.5 rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    2-10 characters, letters and numbers only. Example: OFFICE1, BRANCH2, ADMIN
                  </p>
                </div>
              ) : (
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Each computer has a unique ID to prevent duplicate control numbers.
                  Your records will have format: MOA-2026-{machineId}-001
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Export Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Download className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Export Records
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Save to file
              </p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Export all records from this computer to a JSON file. Share this file with
            other computers to merge records.
          </p>

          <button
            onClick={handleExport}
            className="w-full px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export All Records
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Import Records
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Load from file
              </p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Import records from another computer. Duplicate control numbers will be
            automatically detected and skipped.
          </p>

          <label className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            Import Records
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className="lg:col-span-2">
            <div
              className={`rounded-xl p-6 border ${
                importResult.errors.length > 0
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Import Complete
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      ✅ Imported: {importResult.imported} records
                    </p>
                    {importResult.duplicates > 0 && (
                      <p className="text-gray-700 dark:text-gray-300">
                        ⚠️ Skipped duplicates: {importResult.duplicates}
                      </p>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                        View Details ({importResult.errors.length} items)
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <li key={index} className="pl-4">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-white mb-2">
                1. Export from PC 1
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Click "Export All Records" to save records to a JSON file
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white mb-2">
                2. Transfer File
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Copy the JSON file to PC 2 via USB, email, or network share
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white mb-2">
                3. Import to PC 2
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Click "Import Records" and select the file. Duplicates are automatically
                skipped
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
