import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "../../../app/components/ui/button";
import { Input } from "../../../app/components/ui/input";
import { Label } from "../../../app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../app/components/ui/select";
import { Textarea } from "../../../app/components/ui/textarea";
import { FileUploadField } from "../../../shared/components/FileUploadField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { saveFileBlob } from "../../../shared/storage/fileStorageService";
import { loadOjtRecords, saveOjtRecords } from "../storage";
import type { OjtRecord } from "../types";

const PDF_ACCEPT = ".pdf,application/pdf";

export function AddOjtRecord() {
  const [studentName, setStudentName] = useState("");
  const [company, setCompany] = useState("");
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState<"complete" | "missing">("missing");
  const [notes, setNotes] = useState("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateFileName, setCertificateFileName] = useState("");
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!studentName.trim() || !company.trim() || !school.trim()) {
      setMessage("Student name, company, and school are required.");
      return;
    }

    let certificateKey: string | undefined;
    if (certificateFile) {
      certificateKey = await saveFileBlob(certificateFile);
    }

    const now = new Date().toISOString();
    const record: OjtRecord = {
      id: crypto.randomUUID(),
      date: now.slice(0, 10),
      createdAt: now,
      studentName: studentName.trim(),
      company: company.trim(),
      school: school.trim(),
      program: program.trim() || undefined,
      status,
      certificateFile: certificateKey,
      certificateFileName: certificateFileName || undefined,
      notes: notes.trim() || undefined,
    };

    saveOjtRecords([...loadOjtRecords(), record]);

    setStudentName("");
    setCompany("");
    setSchool("");
    setProgram("");
    setStatus("missing");
    setNotes("");
    setCertificateFile(null);
    setCertificateFileName("");
    setMessage("OJT record saved successfully.");
  };

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title="Add OJT Record"
        description="Create a certificate management record without affecting the MOA/LO workflow."
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Name</Label>
            <Input id="studentName" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company / Office</Label>
            <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <Input id="school" value={school} onChange={(event) => setSchool(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program">Program</Label>
            <Input id="program" value={program} onChange={(event) => setProgram(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value: "complete" | "missing") => setStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <FileUploadField
              label="Certificate PDF"
              accept={PDF_ACCEPT}
              fileName={certificateFileName}
              onSelect={(file) => {
                setCertificateFile(file ?? null);
                setCertificateFileName(file?.name ?? "");
              }}
            />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button type="button" onClick={() => void handleSave()}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            Save OJT Record
          </Button>
          {message ? <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
