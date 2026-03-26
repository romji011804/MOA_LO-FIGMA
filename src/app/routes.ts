import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./components/Dashboard";
import { AddRecord } from "./components/AddRecord";
import { ViewRecords } from "./components/ViewRecords";
import { ViewSingleRecord } from "./components/ViewSingleRecord";
import { ImportExport } from "./components/ImportExport";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "add-record", Component: AddRecord },
      { path: "view-records", Component: ViewRecords },
      { path: "record/:id", Component: ViewSingleRecord },
      { path: "import-export", Component: ImportExport },
    ],
  },
]);
