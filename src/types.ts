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

type ProcessMode = "sequential" | "parallel";

type ExportType = "default" | "named";

interface LoadFolderOptions {
    processMode?: ProcessMode;
}

interface LoadModuleOptions {
    processMode?: ProcessMode;
    exportType?: ExportType;
    preferredExportName: string;
}

export type { ExportType, ProcessMode, LoadFolderOptions, LoadFoldersCallback, LoadModuleOptions, LoadModulesCallback, ModuleExport, ModuleNamespace, ProcessItem };
