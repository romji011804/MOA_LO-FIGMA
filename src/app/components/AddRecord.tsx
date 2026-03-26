import { useEffect, useRef, useState } from "react";
import {
  School,
  BookOpen,
  Clock,
  Calendar,
  Activity,
  Workflow,
  FileText,
  Scale,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { loadRecords, saveRecords, type RecordItem } from "../records";
import { isIndexedDbAvailable, saveFileBlob } from "../fileStorage";

/** PDF/DOC/DOCX — avoid nesting <input type="file"> inside <button> (invalid HTML; breaks pickers in some browsers). */
const DOC_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/x-pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function AddRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");
  const [loUploadType, setLoUploadType] = useState<"file" | "link">("file");
  const [moaUploadType, setMoaUploadType] = useState<"file" | "link">("file");
  const [school, setSchool] = useState("");
  const [course, setCourse] = useState("");
  const [hours, setHours] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [status, setStatus] = useState<"" | "Ongoing" | "Completed">("");
  const [workflow, setWorkflow] = useState("");
  const [legalOpinionLink, setLegalOpinionLink] = useState("");
  const [moaLink, setMoaLink] = useState("");
  const [legalOpinionFileName, setLegalOpinionFileName] = useState("");
  const [moaFileName, setMoaFileName] = useState("");
  const [legalOpinionFileData, setLegalOpinionFileData] = useState("");
  const [moaFileData, setMoaFileData] = useState("");
  const [legalOpinionFile, setLegalOpinionFile] = useState<File | null>(null);
  const [moaFile, setMoaFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const loFileInputRef = useRef<HTMLInputElement | null>(null);
  const moaFileInputRef = useRef<HTMLInputElement | null>(null);
  const schools = [
    "University of the Philippines",
    "Ateneo de Manila University",
    "De La Salle University",
    "University of Santo Tomas",
    "Polytechnic University of the Philippines",
  ];
  const courses = [
    "Bachelor of Science in Computer Science",
    "Bachelor of Arts in Communication",
    "Bachelor of Science in Nursing",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Business Administration",
  ];

  useEffect(() => {
    if (!editId) return;
    const record = loadRecords().find((item) => item.id === editId);
    if (!record) return;
    setSchool(record.school);
    setCourse(record.course);
    setHours(record.hours || "");
    setDateReceived(record.dateReceived || "");
    setStatus(record.status);
    setWorkflow(record.workflow);
    setLoUploadType(record.legalOpinionType || "file");
    setMoaUploadType(record.moaType || "file");
    if (record.legalOpinionType === "link") {
      setLegalOpinionLink(record.legalOpinionValue || "");
    } else {
      setLegalOpinionFileName(record.legalOpinionFileName || "");
      setLegalOpinionFileData(record.legalOpinionValue || "");
    }
    if (record.moaType === "link") {
      setMoaLink(record.moaValue || "");
    } else {
      setMoaFileName(record.moaFileName || "");
      setMoaFileData(record.moaValue || "");
    }
  }, [editId]);

  const generateControlNumber = (records: RecordItem[]) => {
    // Get or prompt for machine identifier (user's preferred name)
    const getMachineId = () => {
      let machineId = localStorage.getItem('machine-id');
      if (!machineId) {
        // Prompt user for a preferred name/identifier
        const userInput = prompt(
          'Enter a unique identifier for this computer (e.g., OFFICE1, BRANCH2, ADMIN):\n\n' +
          'This will be used in control numbers like: MOA-2026-OFFICE1-001\n\n' +
          'Use 2-50 characters (letters and numbers only)'
        );
        
        if (userInput) {
          // Clean and validate input
          machineId = userInput
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '') // Remove special characters
            .substring(0, 50); // Max 50 characters
          
          if (machineId.length < 2) {
            // Fallback to random if too short
            machineId = Math.random().toString(36).substring(2, 6).toUpperCase();
          }
          
          localStorage.setItem('machine-id', machineId);
        } else {
          // User cancelled, use random
          machineId = Math.random().toString(36).substring(2, 6).toUpperCase();
          localStorage.setItem('machine-id', machineId);
        }
      }
      return machineId;
    };

    const machineId = getMachineId();
    const numbers = records
      .map((record) => record.controlNumber.match(/MOA-\d{4}-([A-Z0-9]+)-(\d+)/))
      .filter((match) => match && match[1] === machineId) // Only count this machine's records
      .map((match) => (match ? Number(match[2]) : 0));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    const year = new Date().getFullYear();
    
    // Format: MOA-2026-OFFICE1-001 (Year-MachineID-Sequence)
    return `MOA-${year}-${machineId}-${String(next).padStart(3, "0")}`;
  };

  const assignLoFile = (file: File | undefined) => {
    if (!file) {
      setLegalOpinionFileName("");
      setLegalOpinionFileData("");
      setLegalOpinionFile(null);
      return;
    }
    setLegalOpinionFileName(file.name);
    setLegalOpinionFile(file);
    setLegalOpinionFileData("");
    setFormError("");
  };

  const assignMoaFile = (file: File | undefined) => {
    if (!file) {
      setMoaFileName("");
      setMoaFileData("");
      setMoaFile(null);
      return;
    }
    setMoaFileName(file.name);
    setMoaFile(file);
    setMoaFileData("");
    setFormError("");
  };

  const handleSave = async () => {
    if (!school.trim() || !course.trim() || !status || !workflow) {
      setFormError("Please complete School, Course, Status, and Workflow Stage.");
      return;
    }

    const records = loadRecords();
    const editingRecord = editId ? records.find((record) => record.id === editId) : null;
    let nextMoaValue = moaUploadType === "file" ? moaFileData : moaLink.trim();
    let nextLoValue =
      loUploadType === "file" ? legalOpinionFileData : legalOpinionLink.trim();
    const mustStoreNewFile =
      (moaUploadType === "file" && !!moaFile) ||
      (loUploadType === "file" && !!legalOpinionFile);
    if (mustStoreNewFile && !isIndexedDbAvailable()) {
      setFormError(
        "File storage is unavailable (IndexedDB disabled). Use “Paste Link” or enable storage for this site.",
      );
      return;
    }
    try {
      if (moaUploadType === "file" && moaFile) {
        nextMoaValue = await saveFileBlob(moaFile);
      }
      if (loUploadType === "file" && legalOpinionFile) {
        nextLoValue = await saveFileBlob(legalOpinionFile);
      }
    } catch {
      setFormError("Failed to store uploaded PDF/document. Please try again.");
      return;
    }
    const newRecord: RecordItem = {
      id: editingRecord?.id || String(Date.now()),
      controlNumber: editingRecord?.controlNumber || generateControlNumber(records),
      school: school.trim(),
      course: course.trim(),
      status,
      workflow,
      hours: hours.trim(),
      dateReceived,
      moaType: moaUploadType,
      moaValue: nextMoaValue,
      moaFileName:
        moaUploadType === "file" && moaFileName ? moaFileName : undefined,
      legalOpinionType: loUploadType,
      legalOpinionValue: nextLoValue,
      legalOpinionFileName:
        loUploadType === "file" && legalOpinionFileName ? legalOpinionFileName : undefined,
    };

    const updated = editingRecord
      ? records.map((record) => (record.id === editingRecord.id ? newRecord : record))
      : [...records, newRecord];
    saveRecords(updated);
    setFormError("");
    navigate("/view-records");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
          {editId ? "Edit Record" : "Add New Record"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {editId
            ? "Update record details. MOA and Legal Opinion are optional."
            : "Create a new record. MOA and Legal Opinion are optional."}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 max-w-6xl">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <School className="w-4 h-4" />
                School/University
              </label>
              <input
                type="text"
                list="school-options"
                placeholder="Enter or select school name"
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              />
              <datalist id="school-options">
                {schools.map((school) => (
                  <option key={school} value={school} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BookOpen className="w-4 h-4" />
                Course
              </label>
              <input
                type="text"
                list="course-options"
                placeholder="Enter or select course name"
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              />
              <datalist id="course-options">
                {courses.map((course) => (
                  <option key={course} value={course} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4" />
                Hours
              </label>
              <input
                type="number"
                placeholder="Enter hours"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4" />
                Date Received
              </label>
              <input
                type="date"
                value={dateReceived}
                onChange={(event) => setDateReceived(event.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Activity className="w-4 h-4" />
                Status
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "" | "Ongoing" | "Completed")
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              >
                <option value="">Select status</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Workflow className="w-4 h-4" />
                Workflow Stage
              </label>
              <select
                value={workflow}
                onChange={(event) => setWorkflow(event.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              >
                <option value="">Select workflow stage</option>
                <option value="For Review">For Review</option>
                <option value="Approved">Approved</option>
                <option value="Missing Legal Opinion">Missing Legal Opinion</option>
                <option value="Missing MOA">Missing MOA</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Legal Opinion Section */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Legal Opinion
                </h3>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setLoUploadType("file")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    loUploadType === "file"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500"
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setLoUploadType("link")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    loUploadType === "link"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500"
                  }`}
                >
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  Paste Link
                </button>
              </div>

              {loUploadType === "file" ? (
                <label
                  htmlFor="lo-file-input"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    assignLoFile(e.dataTransfer.files?.[0]);
                  }}
                  className="block w-full cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg p-6 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Click to choose a file or drag and drop here
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PDF, DOC, DOCX
                  </p>
                  {legalOpinionFileName && (
                    <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                      Selected: {legalOpinionFileName}
                    </p>
                  )}
                  <input
                    id="lo-file-input"
                    ref={loFileInputRef}
                    type="file"
                    accept={DOC_ACCEPT}
                    className="sr-only"
                    onChange={(event) => {
                      assignLoFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <input
                  type="url"
                  placeholder="Paste document link here"
                  value={legalOpinionLink}
                  onChange={(event) => setLegalOpinionLink(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
                />
              )}
            </div>

            {/* Memorandum of Agreement Section */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Memorandum of Agreement
                </h3>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMoaUploadType("file")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    moaUploadType === "file"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500"
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setMoaUploadType("link")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    moaUploadType === "link"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500"
                  }`}
                >
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  Paste Link
                </button>
              </div>

              {moaUploadType === "file" ? (
                <label
                  htmlFor="moa-file-input"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    assignMoaFile(e.dataTransfer.files?.[0]);
                  }}
                  className="block w-full cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg p-6 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Click to choose a file or drag and drop here
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PDF, DOC, DOCX
                  </p>
                  {moaFileName && (
                    <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                      Selected: {moaFileName}
                    </p>
                  )}
                  <input
                    id="moa-file-input"
                    ref={moaFileInputRef}
                    type="file"
                    accept={DOC_ACCEPT}
                    className="sr-only"
                    onChange={(event) => {
                      assignMoaFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <input
                  type="url"
                  placeholder="Paste document link here"
                  value={moaLink}
                  onChange={(event) => setMoaLink(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
                />
              )}
            </div>
          </div>
        </div>
        {formError && (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}

        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate("/view-records")}
            className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            {editId ? "Update Record" : "Save Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
