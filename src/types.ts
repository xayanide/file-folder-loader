interface ModuleNamespace {
    default?: ModuleExport;
    [key: string]: ModuleExport | undefined;
}

interface ModuleExport {
    [key: string]: unknown | undefined;
}

type ProcessPathCallback = (itemPath: string) => void | Promise<void>;

type LoadFoldersCallback = (folderPath: string, folderName: string) => unknown | Promise<unknown>;

type LoadModulesCallback = (moduleExport: unknown, moduleFileUrlHref: string, moduleFileName: string) => unknown | Promise<unknown>;

type ProcessMode = "sequential" | "concurrent";

type ExportType = "default" | "named" | "all";

type NamedExports = string | "default" | "*";

interface GetFoldersOptions {
    isRecursive?: boolean;
    processMode?: string | ProcessMode;
}

interface GetModulesOptions {
    isRecursive?: boolean;
    processMode?: string | ProcessMode;
}

interface LoadFoldersOptions {
    processMode?: ProcessMode;
}

interface LoadModulesOptions {
    processMode?: ProcessMode;
    exportType?: ExportType;
    preferredExportName?: NamedExports;
    isImportEnabled?: boolean;
}

export type {
    ExportType,
    GetFoldersOptions,
    GetModulesOptions,
    ProcessMode,
    LoadFoldersOptions,
    LoadFoldersCallback,
    LoadModulesOptions,
    LoadModulesCallback,
    ModuleExport,
    ModuleNamespace,
    ProcessPathCallback,
};
