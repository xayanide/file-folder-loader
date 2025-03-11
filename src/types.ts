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

interface LoadFolderOptions {
    processMode?: ProcessMode;
}

interface LoadModuleOptions {
    processMode?: ProcessMode;
    exportType?: ExportType;
    preferredExportName?: NamedExports;
    isImportEnabled?: boolean;
}

export type { ExportType, ProcessMode, LoadFolderOptions, LoadFoldersCallback, LoadModuleOptions, LoadModulesCallback, ModuleExport, ModuleNamespace, ProcessPathCallback };
