import { AddOjtRecord } from "./components/AddRecord";
import { OjtDashboard } from "./components/Dashboard";
import { OjtQrCodes } from "./components/QrCodes";
import { OjtReports } from "./components/Reports";
import { ViewOjtRecords } from "./components/ViewRecords";

export const ojtRoutes = [
  { path: "ojt", Component: OjtDashboard },
  { path: "ojt/add-record", Component: AddOjtRecord },
  { path: "ojt/view-records", Component: ViewOjtRecords },
  { path: "ojt/qr-codes", Component: OjtQrCodes },
  { path: "ojt/reports", Component: OjtReports },
];
