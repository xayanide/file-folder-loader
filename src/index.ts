import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeUtilTypes from "node:util/types";
import type { LoadFolderOptions, LoadFoldersCallback, LoadModuleOptions, LoadModulesCallback, ModuleExport, ModuleNamespace, ProcessPathCallback } from "./types.js";
import type { Dirent } from "node:fs";

const MODULE_FILE_EXTENSIONS_PATTERN = /\.(m?js|cjs|mts|cts|ts|jsx|tsx)$/;
const IMPORTABLE_MODULE_FILE_EXTENSIONS_PATTERN = /\.(m?js|cjs|mts|cts)$/;

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
    isImportEnabled: true,
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

async function processPaths(paths: string[], processMode: string, processPath: ProcessPathCallback) {
    if (processMode === "concurrent") {
        await Promise.all(paths.map(processPath));
    } else {
        for (const path of paths) {
            if (nodeUtilTypes.isAsyncFunction(processPath)) {
                await processPath(path);
                continue;
            }
            processPath(path);
        }
    }
}

/** Warning: Recursive can be tasking with nested directories. */
async function getFolders(dirPath: string, isRecursive = false) {
    try {
        const entries = await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
        const directories = entries.filter((entry) => {
            return entry.isDirectory();
        });
        const directoryPaths = directories.map((entry) => {
            return nodePath.join(dirPath, entry.name);
        });
        if (!isRecursive) {
            return directoryPaths;
        }
        const subDirPaths = await Promise.all(
            directories.map(async function (entry): Promise<string[]> {
                return await getFolders(nodePath.join(dirPath, entry.name), true);
            }),
        );
        return [...directoryPaths, ...subDirPaths.flat()];
    } catch (error) {
        handleError(`Failed to get folders. Directory path: ${dirPath}`, error);
        return [];
    }
}

/** Warning: Recursive can be tasking for nested directories. */
async function getModules(
    dirPath: string,
    isRecursive = false,
    filterCallback = function (entry: Dirent) {
        return entry.isFile() && MODULE_FILE_EXTENSIONS_PATTERN.test(entry.name);
    },
): Promise<string[]> {
    try {
        const entries = await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
        const filePaths = entries.filter(filterCallback).map(function (entry) {
            return nodePath.join(dirPath, entry.name);
        });
        if (!isRecursive) {
            return filePaths;
        }
        const subDirs = entries.filter((entry) => {
            return entry.isDirectory();
        });
        const subDirFilePaths = await Promise.all(
            subDirs.map(async function (entry) {
                return await getModules(nodePath.join(dirPath, entry.name), true, filterCallback);
            }),
        );
        return [...filePaths, ...subDirFilePaths.flat()];
    } catch (error) {
        console.error(`Failed to get modules. Directory path: ${dirPath}`, error);
        return [];
    }
}

function getAsyncAwareCallback(isLoadCallbackAsync: boolean, loadCallback: LoadFoldersCallback) {
    if (isLoadCallbackAsync) {
        async function processPathAsync(folderPath: string) {
            const folderName = nodePath.basename(folderPath);
            await loadCallback(folderPath, folderName);
        }
        return processPathAsync;
    } else {
        function processPathSync(folderPath: string) {
            const folderName = nodePath.basename(folderPath);
            loadCallback(folderPath, folderName);
        }
        return processPathSync;
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

async function loadFolders(folderPaths: string[], loadCallback: LoadFoldersCallback, options?: LoadFolderOptions) {
    if (!Array.isArray(folderPaths)) {
        throw new Error(`Invalid folderPaths: ${folderPaths}. Must be a string array.`);
    }
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: ${loadCallback}. Must be a function.`);
    }
    const loadOptions = { ...DEFAULT_LOAD_FOLDER_OPTIONS, ...options };
    const processMode = loadOptions.processMode;
    if (typeof processMode !== "string" || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be a non-empty string.`);
    }
    const isLoadCallbackAsync = nodeUtilTypes.isAsyncFunction(loadCallback);
    if (processMode === "concurrent" && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. Process mode: concurrent requires an asynchronous load callback.");
    }
    return await processPaths(folderPaths, processMode, getAsyncAwareCallback(isLoadCallbackAsync, loadCallback));
}

async function loadModules(modulePaths: string[], loadCallback: LoadModulesCallback, options?: LoadModuleOptions) {
    if (!Array.isArray(modulePaths)) {
        throw new Error(`Invalid modulePaths: ${modulePaths}. Must be a string array.`);
    }
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: ${loadCallback}. Must be a function.`);
    }
    const loadOptions = { ...DEFAULT_LOAD_MODULE_OPTIONS, ...options };
    const processMode = loadOptions.processMode;
    const exportType = loadOptions.exportType;
    const preferredExportName = loadOptions.preferredExportName;
    const isImportEnabled = loadOptions.isImportEnabled;
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be a non-empty string.`);
    }
    if (!exportType || !DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid exportType: ${exportType}. Must be a non-empty string.`);
    }
    if (typeof preferredExportName !== "string" || preferredExportName.trim() === "") {
        throw new Error(`Invalid preferred export name: ${preferredExportName}. Must be a non-empty string.`);
    }
    if (typeof isImportEnabled !== "boolean") {
        throw new Error(`Invalid isImportEnabled: ${isImportEnabled}. Must be a boolean.`);
    }
    const isLoadCallbackAsync = nodeUtilTypes.isAsyncFunction(loadCallback);
    if (processMode === "concurrent" && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. Process mode: concurrent requires an asynchronous load callback.");
    }
    async function processPath(filePath: string) {
        const fileUrlHref = nodeUrl.pathToFileURL(filePath).href;
        const fileName = nodePath.basename(fileUrlHref);
        if (!IMPORTABLE_MODULE_FILE_EXTENSIONS_PATTERN.test(fileName)) {
            return;
        }
        if (!isImportEnabled) {
            if (isLoadCallbackAsync) {
                await loadCallback(null, fileUrlHref, fileName);
                return;
            }
            loadCallback(null, fileUrlHref, fileName);
            return;
        }
        const moduleExports = await importModule(fileUrlHref, exportType, preferredExportName);
        for (const moduleExport of moduleExports) {
            if (isLoadCallbackAsync) {
                await loadCallback(moduleExport, fileUrlHref, fileName);
                continue;
            }
            loadCallback(moduleExport, fileUrlHref, fileName);
        }
    }
    return await processPaths(modulePaths, processMode, processPath);
}

const fileFolderLoader = { getModules, getFolders, loadModules, loadFolders };
export default fileFolderLoader;
export { getModules, getFolders, loadModules, loadFolders };
