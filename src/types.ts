import type { Dirent } from "node:fs";

type ModuleExport = unknown | undefined | null;

interface ModuleNamespace {
    default?: ModuleExport;
    [key: string]: ModuleExport | undefined;
}

type ProcessFileCallback = (file: Dirent, folderPath: string) => void | Promise<void>;

type ProcessPathCallback = (itemPath: string) => void | Promise<void>;

type LoadFoldersCallback = (folderName: string, folderPath: string) => void | Promise<void>;

type LoadModulesCallback = (moduleExport: ModuleExport, moduleFileUrlHref: string, moduleFileName: string) => void | Promise<void>;

type ProcessMode = "sequential" | "concurrent";

type ExportType = "default" | "named" | "all";

type PreferredExportName = string | "default" | "*";

interface GetModulesOptions {
    isRecursive?: boolean;
    processMode?: ProcessMode;
}

interface GetFoldersOptions {
    isRecursive?: boolean;
    processMode?: ProcessMode;
}

interface LoadModulesOptions {
    processMode?: ProcessMode;
    exportType?: ExportType;
    preferredExportName?: PreferredExportName;
    isImportEnabled?: boolean;
}

interface LoadFoldersOptions {
    processMode?: ProcessMode;
}

interface ProcessFolderPathsOptions {
    isFileConcurrent: boolean;
    isFolderConcurrent: boolean;
}

export type {
    ExportType,
    GetModulesOptions,
    GetFoldersOptions,
    LoadModulesOptions,
    LoadModulesCallback,
    LoadFoldersOptions,
    LoadFoldersCallback,
    ModuleExport,
    ModuleNamespace,
    ProcessMode,
    ProcessFileCallback,
    ProcessFolderPathsOptions,
    ProcessPathCallback,
};
