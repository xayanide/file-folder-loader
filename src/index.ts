import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import type { PathLike } from "node:fs";
import type { LoadFolderOptions, LoadFoldersCallback, LoadModuleOptions, LoadModulesCallback, ModuleExport, ModuleNamespace, ProcessItem } from "./types.js";

const DEFAULT_EXPORT_NAME = "default";

const DEFAULT_FOLDER_PROCESS_MODE = "parallel";
const DEFAULT_MODULE_PROCESS_MODE = "parallel";

const DEFAULT_EXPORT_TYPE = "default";
const DEFAULT_NAMED_EXPORT = "default";

const DEFAULT_IMPORT_MODES = ["sequential", "parallel"];
const DEFAULT_EXPORT_TYPES = ["default", "named"];

const DEFAULT_LOAD_FOLDER_OPTIONS = {
    processMode: DEFAULT_FOLDER_PROCESS_MODE,
};

const DEFAULT_LOAD_MODULE_OPTIONS = {
    processMode: DEFAULT_MODULE_PROCESS_MODE,
    exportType: DEFAULT_EXPORT_TYPE,
    preferredExportName: DEFAULT_NAMED_EXPORT,
};

function isAsyncFunction(fn: unknown) {
    return typeof fn === "function" && fn.constructor.name === "AsyncFunction";
}

async function processItems(items: string[], processMode: string, loadItem: ProcessItem) {
    if (processMode === "parallel") {
        await Promise.all(items.map(loadItem));
    } else {
        for (const itemPath of items) {
            if (isAsyncFunction(loadItem)) {
                await loadItem(itemPath);
                continue;
            }
            loadItem(itemPath);
        }
    }
}

async function getFolders(dirPath: PathLike) {
    try {
        const entries = await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
        const directories = entries.filter((entry) => {
            return entry.isDirectory();
        });
        const folderNames = directories.map((directory) => {
            return directory.name;
        });
        return folderNames;
    } catch (error) {
        console.error(`Failed to get folders. Directory path: ${dirPath}:\n`, error);
        return;
    }
}

function getAsyncAwareLoadFolder(dirPath: string, isLoadCallbackAsync: boolean, callback: LoadFoldersCallback) {
    if (isLoadCallbackAsync) {
        async function loadFolderAsync(folderName: string) {
            await callback(folderName, nodePath.join(dirPath, folderName));
        }
        return loadFolderAsync;
    } else {
        function loadFolderSync(folderName: string) {
            callback(folderName, nodePath.join(dirPath, folderName));
        }
        return loadFolderSync;
    }
}

async function loadFolders(folders: string[], dirPath: string, loadCallback: LoadFoldersCallback, options?: LoadFolderOptions) {
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: ${loadCallback}. Must be a function.`);
    }
    const loadOptions = { ...DEFAULT_LOAD_FOLDER_OPTIONS, ...options };
    const processMode = loadOptions.processMode;
    if (!processMode || !DEFAULT_IMPORT_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be a non-empty string.`);
    }
    const isLoadCallbackAsync = isAsyncFunction(loadCallback);
    if (processMode === "parallel" && !isLoadCallbackAsync) {
        throw new Error("Process mode: parallel requires an asynchronous load callback.");
    }
    return await processItems(folders, processMode, getAsyncAwareLoadFolder(dirPath, isLoadCallbackAsync, loadCallback));
}

async function getModules(
    dirPath: PathLike,
    filterCallback: (fileName: string) => boolean = (fileName) => {
        return fileName.endsWith(".js") || fileName.endsWith(".ts") || fileName.endsWith(".cjs") || fileName.endsWith(".mjs");
    },
) {
    try {
        const entries = await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
        const files = entries.filter((entry) => {
            return entry.isFile();
        });
        const fileNames = files.map((file) => {
            return file.name;
        });
        return fileNames.filter(filterCallback);
    } catch (error) {
        console.error(`Failed to get modules. Directory path: ${dirPath}:\n`, error);
        return;
    }
}

async function importModule(fileUrlHref: string, exportType: string, preferredExportName: string) {
    const isNamedExportType = exportType === "named";
    const moduleNamespace: ModuleNamespace = await import(fileUrlHref);
    if (isNamedExportType && preferredExportName === "*") {
        const moduleExports: ModuleExport[] = [];
        for (const exportName in moduleNamespace) {
            const moduleExport = moduleNamespace[exportName];
            if (!moduleExport || !Object.prototype.hasOwnProperty.call(moduleNamespace, exportName) || exportName === DEFAULT_EXPORT_NAME) {
                console.error(
                    `Invalid module. Must be a named export called '${preferredExportName}'. Unable to verify named export '${exportName}'. Module: ${fileUrlHref}`,
                );
                continue;
            }
            moduleExports.push(moduleExport);
        }
        return moduleExports;
    } else {
        const exportName = isNamedExportType ? preferredExportName : DEFAULT_EXPORT_NAME;
        const moduleExport = moduleNamespace[exportName];
        if (!moduleExport || !Object.prototype.hasOwnProperty.call(moduleNamespace, exportName)) {
            throw new Error(
                isNamedExportType
                    ? `Invalid module. Must be a named export called '${preferredExportName}'. ${
                          exportName === DEFAULT_EXPORT_NAME ? "Unable to verify named export" : "Unable to verify preferred export name"
                      } '${exportName}'. Module: ${fileUrlHref}`
                    : `Invalid module. Must be a default export. Unable to verify default export '${exportName}'. Module: ${fileUrlHref}`,
            );
        }
        return [moduleExport];
    }
}

async function loadModules(modules: string[], dirPath: string, loadCallback: LoadModulesCallback, options?: LoadModuleOptions) {
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: ${loadCallback}. Must be a function.`);
    }
    const loadOptions = { ...DEFAULT_LOAD_MODULE_OPTIONS, ...options };
    const processMode = loadOptions.processMode;
    const exportType = loadOptions.exportType;
    const preferredExportName = loadOptions.preferredExportName;
    if (!processMode || !DEFAULT_IMPORT_MODES.includes(processMode)) {
        throw new Error(`Invalid import mode: ${processMode}. Must be a non-empty string.`);
    }
    if (!exportType || !DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid exportType: ${exportType}. Must be a non-empty string.`);
    }
    if (!preferredExportName || typeof preferredExportName !== "string") {
        throw new Error(`Invalid preferred export name: ${preferredExportName}. Must be a non-empty string.`);
    }
    const isLoadCallbackAsync = isAsyncFunction(loadCallback);
    if (processMode === "parallel" && !isLoadCallbackAsync) {
        throw new Error("Import mode: parallel requires an asynchronous load callback.");
    }
    async function loadModule(fileName: string) {
        const fileUrlHref = nodeUrl.pathToFileURL(nodePath.join(dirPath, fileName)).href;
        const moduleExports = await importModule(fileUrlHref, exportType, preferredExportName);
        for (const moduleExport of moduleExports) {
            if (isLoadCallbackAsync) {
                await loadCallback(moduleExport, fileUrlHref, fileName);
                continue;
            }
            loadCallback(moduleExport, fileUrlHref, fileName);
        }
    }
    return await processItems(modules, processMode, loadModule);
}

const fileFolderLoader = { getModules, getFolders, loadModules, loadFolders };
export default fileFolderLoader;
export { getModules, getFolders, loadModules, loadFolders };
