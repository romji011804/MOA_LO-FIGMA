import { useState } from "react";
import { Button } from "../../../app/components/ui/button";
import { Input } from "../../../app/components/ui/input";
import { Label } from "../../../app/components/ui/label";
import { PageHeader } from "../../../shared/components/PageHeader";
import { FileUploadField } from "../../../shared/components/FileUploadField";
import { saveFileBlob } from "../../../shared/storage/fileStorageService";
import { loadOjtQrRecords, saveOjtQrRecords } from "../storage";

export function OjtQrCodes() {
  const [program, setProgram] = useState("");
  const [school, setSchool] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [fileUrl, setFileUrl] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrFileName, setQrFileName] = useState("");
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!program.trim() || !school.trim() || !fileUrl.trim()) {
      setMessage("Program, school, and file URL are required.");
      return;
    }

    const qrImageFile = qrFile ? await saveFileBlob(qrFile) : undefined;
    const records = loadOjtQrRecords();
    records.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      program: program.trim(),
      school: school.trim(),
      year: Number(year) || new Date().getFullYear(),
      fileUrl: fileUrl.trim(),
      qrImageFile,
      qrImageFileName: qrFileName || undefined,
    });
    saveOjtQrRecords(records);
    setProgram("");
    setSchool("");
    setYear(String(new Date().getFullYear()));
    setFileUrl("");
    setQrFile(null);
    setQrFileName("");
    setMessage("QR reference saved.");
  };

  return (
    <div className="space-y-6 p-8">
      <PageHeader title="OJT QR Codes" description="Manage QR references used by certificate workflows." />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qrProgram">Program</Label>
            <Input id="qrProgram" value={program} onChange={(event) => setProgram(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qrSchool">School</Label>
            <Input id="qrSchool" value={school} onChange={(event) => setSchool(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qrYear">Year</Label>
            <Input id="qrYear" value={year} onChange={(event) => setYear(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qrUrl">File URL</Label>
            <Input id="qrUrl" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
          </div>
        </div>
        <div className="mt-5">
          <FileUploadField
            label="Optional QR image"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            fileName={qrFileName}
            onSelect={(file) => {
              setQrFile(file ?? null);
              setQrFileName(file?.name ?? "");
            }}
          />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button type="button" onClick={() => void handleSave()}>
            Save QR Reference
          </Button>
          {message ? <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
