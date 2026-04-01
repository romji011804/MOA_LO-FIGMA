import { FileCheck, FileWarning, Files } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../../../shared/components/PageHeader";
import { OJT_RECORDS_UPDATED_EVENT, getOjtStats, loadOjtRecords } from "../storage";
import type { OjtRecord } from "../types";

function OjtStatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function OjtDashboard() {
  const [records, setRecords] = useState<OjtRecord[]>(() => loadOjtRecords());

  useEffect(() => {
    const sync = () => setRecords(loadOjtRecords());
    window.addEventListener(OJT_RECORDS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(OJT_RECORDS_UPDATED_EVENT, sync);
  }, []);

  const stats = getOjtStats(records);

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title="OJT Module"
        description="Certificate management, QR references, and OJT-specific reporting."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OjtStatCard
          title="Total OJT Records"
          value={stats.totalCertificates}
          icon={<Files className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          color="bg-blue-100 dark:bg-blue-900/30"
        />
        <OjtStatCard
          title="Complete Certificates"
          value={stats.completeCertificates}
          icon={<FileCheck className="h-6 w-6 text-green-600 dark:text-green-400" />}
          color="bg-green-100 dark:bg-green-900/30"
        />
        <OjtStatCard
          title="Missing Certificates"
          value={stats.missingCertificates}
          icon={<FileWarning className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          color="bg-yellow-100 dark:bg-yellow-900/30"
        />
      </div>
    </div>
  );
}
