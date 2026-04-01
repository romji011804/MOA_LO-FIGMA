import { useEffect, useMemo, useState } from "react";
import { SearchToolbar } from "../../../shared/components/SearchToolbar";
import { PageHeader } from "../../../shared/components/PageHeader";
import { OJT_RECORDS_UPDATED_EVENT, filterOjtRecords, loadOjtRecords } from "../storage";
import type { OjtRecord } from "../types";

export function ViewOjtRecords() {
  const [records, setRecords] = useState<OjtRecord[]>(() => loadOjtRecords());
  const [search, setSearch] = useState("");

  useEffect(() => {
    const sync = () => setRecords(loadOjtRecords());
    window.addEventListener(OJT_RECORDS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(OJT_RECORDS_UPDATED_EVENT, sync);
  }, []);

  const filteredRecords = useMemo(() => filterOjtRecords(records, search), [records, search]);

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title="OJT Records"
        description="Search and review OJT certificate records independently from MOA/LO records."
      />
      <SearchToolbar search={search} onSearchChange={setSearch} placeholder="Search by student, company, school, program, or status" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/70">
            <tr>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Student</th>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Company</th>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500">School</th>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Program</th>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td className="px-5 py-4 text-sm text-gray-900 dark:text-white">{record.studentName}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{record.company}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{record.school}</td>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{record.program ?? "—"}</td>
                <td className="px-5 py-4 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      record.status === "complete"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                    }`}
                  >
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
