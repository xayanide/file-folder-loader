import type { Dirent } from "node:fs";

type ModuleExport = unknown | undefined | null;

interface ModuleNamespace {
    default?: ModuleExport;
    [key: string]: ModuleExport | undefined;
}

type LoadFolderPathsCallback = (folderName: string, folderPath: string) => void | Promise<void>;

type LoadModulePathsCallback = (moduleExport: ModuleExport, fileUrlHref: string, fileName: string) => void | Promise<void>;

type LoadFolderModulesCallback = (moduleExport: ModuleExport, fileUrlHref: string, fileName: string, folderPath: string, file: Dirent) => void | Promise<void>;

type ProcessItemPathCallback = (itemPath: string) => void | Promise<void>;

type ProcessFileCallback = (file: Dirent, folderPath: string) => void | Promise<void>;

type ExportType = "default" | "named" | "all";

type PreferredExportName = string | "default" | "*";

interface GetModulePathsOptions {
    isRecursive?: boolean;
    isConcurrent?: boolean;
}

interface GetFolderPathsOptions {
    isRecursive?: boolean;
    isConcurrent?: boolean;
}

interface LoadModulePathsOptions {
    isConcurrent?: boolean;
    exportType?: ExportType;
    preferredExportName?: PreferredExportName;
    isImportEnabled?: boolean;
}

interface LoadFolderPathsOptions {
    isConcurrent?: boolean;
}

interface LoadFolderModulesOptions {
    isFileConcurrent?: boolean;
    isFolderConcurrent?: boolean;
    exportType?: ExportType;
    preferredExportName?: PreferredExportName;
    isImportEnabled?: boolean;
}

interface ProcessFolderPathsOptions {
    isFileConcurrent?: boolean;
    isFolderConcurrent?: boolean;
}

export type {
    ExportType,
    GetModulePathsOptions,
    GetFolderPathsOptions,
    LoadModulePathsOptions,
    LoadFolderModulesOptions,
    LoadModulePathsCallback,
    LoadFolderModulesCallback,
    LoadFolderPathsOptions,
    LoadFolderPathsCallback,
    ModuleExport,
    ModuleNamespace,
    PreferredExportName,
    ProcessFileCallback,
    ProcessFolderPathsOptions,
    ProcessItemPathCallback,
};
