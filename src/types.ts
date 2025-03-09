interface ModuleNamespace {
    default?: ModuleExport;
    [key: string]: ModuleExport | undefined;
}

interface ModuleExport {
    [key: string]: unknown | undefined;
}

type ProcessItem = (itemPath: string) => void | Promise<void>;

type LoadFoldersCallback = (folderName: string, folderPath: string) => unknown | Promise<unknown>;

type LoadModulesCallback = (moduleExport: unknown, modulePath: string, moduleFileName: string) => unknown | Promise<unknown>;

type ProcessMode = "sequential" | "concurrent";

type ExportType = "default" | "named";

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

export type { ExportType, ProcessMode, LoadFolderOptions, LoadFoldersCallback, LoadModuleOptions, LoadModulesCallback, ModuleExport, ModuleNamespace, ProcessItem };
