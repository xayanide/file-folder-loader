import type { Dirent } from "node:fs";

type ModuleExport = unknown | undefined | null;

interface ModuleNamespace {
    default?: ModuleExport;
    [key: string]: ModuleExport | undefined;
}

type LoadFolderPathsCallback = (folderPath: string, folderName: string) => void | Promise<void>;

type LoadModulePathsCallback = (moduleExport: ModuleExport, fileUrlHref: string, fileName: string) => void | Promise<void>;

type LoadFolderModulesCallback = (moduleExport: ModuleExport, fileUrlHref: string, fileName: string, folderPath: string, file: Dirent) => void | Promise<void>;

type ProcessItemPathCallback = (itemPath: string) => void | Promise<void>;

type ProcessFileCallback = (file: Dirent, folderPath: string) => void | Promise<void>;

type ExportType = "default" | "named" | "all";

type PreferredExportName = string | "default" | "*";

interface GetModulePathsOptions {
    recursive?: boolean;
    concurrent?: boolean;
}

interface GetFolderPathsOptions {
    recursive?: boolean;
    concurrent?: boolean;
}

interface LoadModulePathsOptions {
    concurrent?: boolean;
    exportType?: ExportType;
    preferredExportName?: PreferredExportName;
    shouldImport?: boolean;
}

interface LoadFolderPathsOptions {
    concurrent?: boolean;
}

interface LoadFolderModulesOptions {
    fileConcurrent?: boolean;
    folderConcurrent?: boolean;
    exportType?: ExportType;
    preferredExportName?: PreferredExportName;
    shouldImport?: boolean;
}

interface ProcessFolderPathsOptions {
    fileConcurrent?: boolean;
    folderConcurrent?: boolean;
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
