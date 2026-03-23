import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";

interface Record {
  id: string;
  control_number: string;
  school: string;
  course: string;
  status: string;
  workflow: string;
  hours?: string;
  date_received?: string;
  moa_file_name?: string;
  moa_type?: string;
  legal_opinion_file_name?: string;
  legal_opinion_type?: string;
  created_at: string;
}

export function CloudSync() {
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "unsynced">("unsynced");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success?: boolean;
    synced?: number;
    already_synced?: number;
    errors?: number;
    message?: string;
  } | null>(null);

  // Fetch unsynced records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/records/unsynced`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
        setFilteredRecords(data);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on sync status
  useEffect(() => {
    if (filter === "unsynced") {
      setFilteredRecords(records);
    } else {
      // For demo purposes, we'll assume all records shown are unsynced
      // In a real implementation, you'd fetch all records and filter
      setFilteredRecords(records);
    }
  }, [filter, records]);

  // Handle record selection
  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  // Sync selected records to cloud
  const handleSync = async () => {
    if (selectedRecords.size === 0) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordIds: Array.from(selectedRecords)
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSyncResult({
          success: true,
          synced: result.synced,
          already_synced: result.already_synced,
          errors: result.errors,
          message: `Successfully synced ${result.synced} records${result.errors > 0 ? `, ${result.errors} errors` : ''}`
        });

        // Refresh records
        await fetchRecords();

        // Clear selection
        setSelectedRecords(new Set());
      } else {
        setSyncResult({
          success: false,
          message: result.error || 'Failed to sync records'
        });
      }
    } catch (error) {
      console.error('Error syncing records:', error);
      setSyncResult({
        success: false,
        message: 'Network error occurred while syncing'
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cloud Sync</h1>
          <p className="text-muted-foreground">
            Upload unsynced records to Firebase for multi-device access
          </p>
        </div>
      </div>

      {/* Filter and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter:</label>
              <Select value={filter} onValueChange={(value: "all" | "unsynced") => setFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsynced">Not Synced Only</SelectItem>
                  <SelectItem value="all">All Records</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecords}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
          </div>

          {selectedRecords.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="ml-auto"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload to Cloud
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Result Alert */}
      {syncResult && (
        <Alert className={syncResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {syncResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={syncResult.success ? "text-green-800" : "text-red-800"}>
            {syncResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Records ({filteredRecords.length})
            {filteredRecords.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading records...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No unsynced records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Control Number</TableHead>
                  <TableHead>School/University</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRecords.has(record.id)}
                        onCheckedChange={(checked) => handleSelectRecord(record.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{record.control_number}</TableCell>
                    <TableCell>{record.school}</TableCell>
                    <TableCell>{record.course}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'Completed' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Not Synced
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(record.created_at).toLocaleDateString()}
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