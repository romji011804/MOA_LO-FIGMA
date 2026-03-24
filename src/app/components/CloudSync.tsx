import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Loader2, Upload, Trash2, RefreshCw, CheckCircle2, XCircle, CloudOff, Cloud
} from "lucide-react";
import {
  loadCloudRecords,
  pushRecordToCloud,
  deleteCloudRecord,
  isFirebaseConfigured,
  type CloudRecord,
} from "../cloudRecords";
import { loadRecords, type RecordItem } from "../records";

type ToastState = { type: "success" | "error"; message: string } | null;

export function CloudSync() {
  const [localRecords, setLocalRecords] = useState<RecordItem[]>([]);
  const [cloudRecords, setCloudRecords] = useState<CloudRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [local, cloud] = await Promise.all([
        loadRecords(),
        isFirebaseConfigured ? loadCloudRecords() : Promise.resolve([]),
      ]);
      setLocalRecords(local);
      setCloudRecords(cloud);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Local records that are NOT yet in cloud (matched by controlNumber)
  const cloudControlNumbers = new Set(cloudRecords.map((r) => r.controlNumber));
  const pendingRecords = localRecords.filter(
    (r) => !cloudControlNumbers.has(r.controlNumber)
  );

  const handleUpload = async (record: RecordItem) => {
    setUploading(record.id);
    try {
      await pushRecordToCloud(record);
      showToast("success", `"${record.controlNumber}" uploaded to cloud.`);
      await refresh();
    } catch (err) {
      showToast("error", `Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleUploadAll = async () => {
    if (pendingRecords.length === 0) return;
    setUploadingAll(true);
    let successCount = 0;
    for (const record of pendingRecords) {
      try {
        await pushRecordToCloud(record);
        successCount++;
      } catch {
        // continue uploading others
      }
    }
    await refresh();
    setUploadingAll(false);
    showToast(
      successCount === pendingRecords.length ? "success" : "error",
      `${successCount} of ${pendingRecords.length} records uploaded.`
    );
  };

  const handleDelete = async (firestoreId: string, controlNumber: string) => {
    setDeleting(firestoreId);
    try {
      await deleteCloudRecord(firestoreId);
      showToast("success", `"${controlNumber}" removed from cloud.`);
      await refresh();
    } catch (err) {
      showToast("error", `Delete failed: ${(err as Error).message}`);
    } finally {
      setDeleting(null);
    }
  };

  // Today's count
  const today = new Date().toDateString();
  const syncedToday = cloudRecords.filter(
    (r) => new Date(r.uploadedAt).toDateString() === today
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cloud Records</h1>
          <p className="text-muted-foreground mt-1">
            Push local records to Firebase Firestore for multi-device access
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <Alert
          className={
            toast.type === "success"
              ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
              : "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
          }
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <AlertDescription
            className={
              toast.type === "success"
                ? "text-green-800 dark:text-green-300"
                : "text-red-800 dark:text-red-300"
            }
          >
            {toast.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      <Alert
        className={
          isFirebaseConfigured
            ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
            : "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
        }
      >
        {isFirebaseConfigured ? (
          <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
        <AlertDescription
          className={
            isFirebaseConfigured
              ? "text-green-800 dark:text-green-300"
              : "text-amber-800 dark:text-amber-300"
          }
        >
          {isFirebaseConfigured
            ? "✅ Firebase Connected — Cloud sync is available."
            : "⚠️ Firebase Not Configured — Add your credentials to .env to enable cloud sync."}
        </AlertDescription>
      </Alert>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Cloud Records", value: cloudRecords.length },
          { label: "Synced Today", value: syncedToday },
          { label: "Pending Upload", value: pendingRecords.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Upload Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Pending Upload ({pendingRecords.length})</CardTitle>
          {pendingRecords.length > 0 && (
            <Button
              size="sm"
              onClick={handleUploadAll}
              disabled={uploadingAll || !isFirebaseConfigured}
            >
              {uploadingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {pendingRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              All local records are synced to the cloud.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control Number</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.controlNumber}</TableCell>
                    <TableCell>{record.school}</TableCell>
                    <TableCell>{record.course}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === "Completed" ? "default" : "secondary"}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.workflow}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpload(record)}
                        disabled={uploading === record.id || !isFirebaseConfigured}
                      >
                        {uploading === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span className="ml-1">Upload</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cloud Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cloud Records ({cloudRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!isFirebaseConfigured ? (
            <div className="text-center py-8 text-muted-foreground">
              <CloudOff className="h-8 w-8 mx-auto mb-2" />
              Configure Firebase to view cloud records.
            </div>
          ) : cloudRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No records found in the cloud.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control Number</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cloudRecords.map((record) => (
                  <TableRow key={record.firestoreId}>
                    <TableCell className="font-medium">{record.controlNumber}</TableCell>
                    <TableCell>{record.school}</TableCell>
                    <TableCell>{record.course}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === "Completed" ? "default" : "secondary"}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.workflow}</TableCell>
                    <TableCell>
                      {new Date(record.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(record.firestoreId, record.controlNumber)}
                        disabled={deleting === record.firestoreId}
                      >
                        {deleting === record.firestoreId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="ml-1">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}