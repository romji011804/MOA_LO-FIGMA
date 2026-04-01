import { useMemo } from "react";
import { PageHeader } from "../../../shared/components/PageHeader";
import { getOjtStats, loadOjtRecords } from "../storage";

export function OjtReports() {
  const records = loadOjtRecords();
  const stats = useMemo(() => getOjtStats(records), [records]);

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title="OJT Reports"
        description="Summarize OJT certificate completion without affecting MOA/LO reports."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Certificates</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalCertificates}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Complete</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{stats.completeCertificates}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Missing</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{stats.missingCertificates}</p>
        </div>
      </div>
    </div>
  );
}
