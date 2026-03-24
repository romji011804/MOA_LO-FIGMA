import { useState, useEffect } from "react";
import { Search, Filter, Pencil, Trash2, Pin, PinOff, Link2, FileX2, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { loadRecords, deleteRecord, type RecordItem } from "../records";
import { getFileBlob } from "../fileStorage";

export function ViewRecords() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [openMessage, setOpenMessage] = useState("");
  const [allRecords, setAllRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const records = await loadRecords();
        setAllRecords(records);
      } catch (error) {
        console.error('Error loading records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const togglePin = (id: string) => {
    setPinnedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const deleteRecords = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      for (const id of ids) {
        await deleteRecord(id);
      }
      setAllRecords((current) => current.filter((record) => !ids.includes(record.id)));
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setPinnedIds((current) => current.filter((id) => !ids.includes(id)));
    } catch (error) {
      console.error('Error deleting records:', error);
      // Could add error handling UI here
    }
  };

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
    setIsDeleteDialogOpen(true);
  };

  const openDocument = async (type?: "file" | "link", value?: string) => {
    if (!value) {
      setOpenMessage("No document available.");
      return;
    }
    if (type === "link") {
      try {
        const url = new URL(value);
        window.open(url.toString(), "_blank", "noopener,noreferrer");
        setOpenMessage("");
      } catch {
        setOpenMessage("Invalid link. Unable to open document.");
      }
      return;
    }
    if (type === "file") {
      // Direct data URI or remote URL — open immediately
      if (value.startsWith("data:") || /^https?:\/\//i.test(value)) {
        const opened = window.open(value, "_blank", "noopener,noreferrer");
        if (!opened) {
          setOpenMessage("Popup blocked. Please allow popups to open files.");
          return;
        }
        setOpenMessage("");
        return;
      }
      // Any other value (plain UUID from API, or legacy idb: key) — fetch via API
      try {
        const blob = await getFileBlob(value);
        if (!blob) {
          setOpenMessage("Saved file was not found. Please re-upload it.");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          setOpenMessage("Popup blocked. Please allow popups to open files.");
          URL.revokeObjectURL(blobUrl);
          return;
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        setOpenMessage("");
        return;
      } catch {
        setOpenMessage("Unable to open saved file.");
        return;
      }
    }
    setOpenMessage("No document available.");
  };


  const isEmpty = allRecords.length === 0;

  const filteredRecords = allRecords.filter((record) => {
    const matchesSearch =
      record.controlNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.course.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "ongoing" && record.status === "Ongoing") ||
      (filterStatus === "completed" && record.status === "Completed") ||
      (filterStatus === "missing-lo" && record.workflow === "Missing Legal Opinion") ||
      (filterStatus === "missing-moa" && record.workflow === "Missing MOA");

    return matchesSearch && matchesFilter;
  });
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned === bPinned) return 0;
    return aPinned ? -1 : 1;
  });
  const allVisibleSelected =
    sortedRecords.length > 0 && sortedRecords.every((record) => selectedIds.includes(record.id));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "Ongoing":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading records...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
          View Records
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and search all MOA and Legal Opinion records
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          {openMessage && (
            <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
              {openMessage}
            </div>
          )}
          {!isEmpty && selectedIds.length > 0 && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-900/20 px-4 py-3">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                {selectedIds.length} record{selectedIds.length > 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    selectedIds.forEach((id) => {
                      if (!pinnedIds.includes(id)) {
                        togglePin(id);
                      }
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-800 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200 hover:bg-blue-100/80 dark:hover:bg-blue-900/40"
                >
                  <Pin className="h-4 w-4" />
                  Pin
                </button>
                <button
                  onClick={() => requestDelete(selectedIds)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by control number, school, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="relative min-w-52">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Records</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="missing-lo">Missing Legal Opinion</option>
                <option value="missing-moa">Missing MOA</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    disabled={isEmpty}
                    checked={allVisibleSelected}
                    onChange={(event) => {
                      if (isEmpty) return;
                      if (event.target.checked) {
                        setSelectedIds((current) => [
                          ...new Set([...current, ...sortedRecords.map((record) => record.id)]),
                        ]);
                      } else {
                        setSelectedIds((current) =>
                          current.filter(
                            (id) => !sortedRecords.some((record) => record.id === id)
                          )
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Control Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  School/University
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Workflow Stage
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedRecords.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => navigate(`/record/${record.id}`)}
                  className="hover:bg-blue-50/60 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200"
                >
                  <td
                    className="px-4 py-4"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {pinnedIds.includes(record.id) && (
                        <Pin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                      {record.controlNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {record.school}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {record.course}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {record.workflow}
                  </td>
                  <td
                    className="px-6 py-4"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openDocument(record.moaType, record.moaValue)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Open MOA"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        MOA
                      </button>
                      <button
                        onClick={() =>
                          openDocument(record.legalOpinionType, record.legalOpinionValue)
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Open Legal Opinion"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        LO
                      </button>
                    </div>
                  </td>
                  <td
                    className="px-6 py-4"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/add-record?editId=${record.id}`)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => togglePin(record.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {pinnedIds.includes(record.id) ? (
                          <>
                            <PinOff className="h-3.5 w-3.5" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-3.5 w-3.5" />
                            Pin
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => requestDelete([record.id])}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Filtered-empty state: records exist but none match search/filter */}
              {!isEmpty && sortedRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      No records match your search or filter.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Try adjusting your search term or filter selection.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* True empty state: no records at all */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-5">
              <FileX2 className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              No records available
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              Add a record to get started. Your MOA and Legal Opinion records will appear here.
            </p>
            <button
              onClick={() => navigate("/add-record")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Add Your First Record
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record{pendingDeleteIds.length > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteIds.length > 1
                ? `This will permanently remove ${pendingDeleteIds.length} selected records from this view. This action cannot be undone.`
                : "This will permanently remove this record from this view. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingDeleteIds([]);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
              onClick={() => {
                deleteRecords(pendingDeleteIds);
                setPendingDeleteIds([]);
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
