import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import type { PathLike } from "node:fs";
import type { LoadFolderOptions, LoadFoldersCallback, LoadModuleOptions, LoadModulesCallback, ModuleExport, ModuleNamespace, ProcessItem } from "./types.js";

const DEFAULT_EXPORT_NAME = "default";

const DEFAULT_FOLDER_PROCESS_MODE = "concurrent";
const DEFAULT_MODULE_PROCESS_MODE = "concurrent";

const DEFAULT_EXPORT_TYPE = "default";
const DEFAULT_NAMED_EXPORT = "default";

const DEFAULT_PROCESS_MODES = ["sequential", "concurrent"];
const DEFAULT_EXPORT_TYPES = ["default", "named"];

const DEFAULT_LOAD_FOLDER_OPTIONS = {
    processMode: DEFAULT_FOLDER_PROCESS_MODE,
};

const DEFAULT_LOAD_MODULE_OPTIONS = {
    processMode: DEFAULT_MODULE_PROCESS_MODE,
    exportType: DEFAULT_EXPORT_TYPE,
    preferredExportName: DEFAULT_NAMED_EXPORT,
};

/**
 * Made a simple wrapper because TypeScript likes seeing errors from catch clauses as unknown. Well errors can be anything, true. -xaya
 */
function handleError(message: string, error: unknown, logError = console.error) {
    if (error instanceof Error) {
        logError(`${message}\n${error.message}${error.stack ? `\n${error.stack}` : ""}`);
        return;
    }
    if (typeof error === "object" && error !== null) {
        logError(`${message}\nUnknown Error Object:\n${JSON.stringify(error, null, 2)}`);
        return;
    }
    logError(`${message}\nUnknown Error Type: ${typeof error}\n${String(error)}`);
}

function isAsyncFunction(fn: unknown) {
    return typeof fn === "function" && fn.constructor.name === "AsyncFunction";
}

async function processItems(items: string[], processMode: string, loadItem: ProcessItem) {
    if (processMode === "concurrent") {
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

async function getFolders(dirPath: PathLike, isRecursive = false) {
    try {
        const entries = await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
        const directories = entries.filter(function (entry) {
            return entry.isDirectory();
        });
        const folderNames = directories.map(function (directory) {
            return directory.name;
        });
        if (isRecursive) {
            for (const directory of directories) {
                const subDirPath = `${dirPath}/${directory.name}`;
                const subFolders = await getFolders(subDirPath, true);
                folderNames.push(
                    ...subFolders.map(function (subFolder) {
                        return `${directory.name}/${subFolder}`;
                    }),
                );
            }
        }
        return folderNames;
    } catch (error) {
        handleError(`Failed to get folders. Directory path: ${dirPath}`, error);
        return [];
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
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be a non-empty string.`);
    }
    const isLoadCallbackAsync = isAsyncFunction(loadCallback);
    if (processMode === "concurrent" && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. Process mode: concurrent requires an asynchronous load callback.");
    }
    return await processItems(folders, processMode, getAsyncAwareLoadFolder(dirPath, isLoadCallbackAsync, loadCallback));
}

async function getModules(
    dirPath: string,
    isRecurive = false,
    filterCallback = function (fileName: string) {
        return fileName.endsWith(".js") || fileName.endsWith(".ts") || fileName.endsWith(".cjs") || fileName.endsWith(".mjs");
    },
) {
    try {
        const entries = await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
        const files = entries.filter(function (entry) {
            return entry.isFile();
        });
        const fileNames = files.map(function (file) {
            return file.name;
        });
        let filteredFileNames = fileNames.filter(filterCallback);
        if (isRecurive) {
            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const subDirFiles = await getModules(nodePath.join(dirPath, entry.name), true, filterCallback);
                filteredFileNames = filteredFileNames.concat(
                    subDirFiles.map(function (file) {
                        return nodePath.join(entry.name, file);
                    }),
                );
            }
        }
        return filteredFileNames;
    } catch (error) {
        handleError(`Failed to get modules. Directory path: ${dirPath}`, error);
        return [];
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
                console.error(`Invalid module. Must be a named export. Unable to verify named export '${exportName}'. Module: ${fileUrlHref}`);
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
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be a non-empty string.`);
    }
    if (!exportType || !DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid exportType: ${exportType}. Must be a non-empty string.`);
    }
    if (!preferredExportName || typeof preferredExportName !== "string") {
        throw new Error(`Invalid preferred export name: ${preferredExportName}. Must be a non-empty string.`);
    }
    const isLoadCallbackAsync = isAsyncFunction(loadCallback);
    if (processMode === "concurrent" && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. Process mode: concurrent requires an asynchronous load callback.");
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
