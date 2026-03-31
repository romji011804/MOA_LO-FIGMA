/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      showSaveDialog: (options: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
      }) => Promise<string | null>;
      saveBinaryFile: (
        filePath: string,
        data: Uint8Array | number[]
      ) => Promise<{ success: boolean; filePath: string }>;
    };
  }
}

export {};
