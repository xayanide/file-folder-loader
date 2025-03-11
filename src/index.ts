import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeUtilTypes from "node:util/types";
import type {
    GetFoldersOptions,
    GetModulesOptions,
    LoadFoldersOptions,
    LoadFoldersCallback,
    LoadModulesOptions,
    LoadModulesCallback,
    ModuleExport,
    ModuleNamespace,
    ProcessMode,
    ProcessPathCallback,
} from "./types.js";
import type { Dirent } from "node:fs";

const MODULE_FILE_EXTENSIONS_PATTERN = /\.(m?js|cjs|mts|cts|ts|jsx|tsx)$/;
const IMPORTABLE_MODULE_FILE_EXTENSIONS_PATTERN = /\.(m?js|cjs|mts|cts)$/;

const DEFAULT_EXPORT_NAME = "default";

const DEFAULT_FOLDER_PROCESS_MODE = "concurrent";
const DEFAULT_MODULE_PROCESS_MODE = "concurrent";

const DEFAULT_EXPORT_TYPE = "default";
const DEFAULT_NAMED_EXPORT = "default";

const DEFAULT_PROCESS_MODES = ["sequential", "concurrent"];
const DEFAULT_EXPORT_TYPES = ["default", "named", "all"];

const DEFAULT_GET_FOLDERS_OPTIONS = {
    isRecursive: false,
    processMode: DEFAULT_FOLDER_PROCESS_MODE,
};

const DEFAULT_GET_MODULES_OPTIONS = {
    isRecursive: false,
    processMode: DEFAULT_MODULE_PROCESS_MODE,
};

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

async function getDirectoryEntries(dirPath: string) {
    try {
        return await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
        handleError(`Failed to read directory. Directory path: ${dirPath}`, error);
        return [];
    }
}

async function getPaths(
    dirPath: string,
    isRecursive: boolean,
    processMode: string | ProcessMode,
    reduceCallback: (acc: string[], entry: Dirent) => string[],
    recursiveCallback: (subDirPath: string) => Promise<string[]>,
) {
    const entries = await getDirectoryEntries(dirPath);
    const paths = entries.reduce<string[]>(reduceCallback, []);
    if (!isRecursive) {
        return paths;
    }
    const directories = entries.filter(function (entry) {
        return entry.isDirectory();
    });
    /**
     * paths.push(...results) is possible for a mutable approach
     * but decided not to go with it to avoid side-effects.
     */
    if (processMode === "sequential") {
        const results: string[] = [];
        for (const entry of directories) {
            const subDirPath = nodePath.join(dirPath, entry.name);
            const subDirResults = await recursiveCallback(subDirPath);
            results.push(...subDirResults);
        }
        return [...paths, ...results];
    }
    const subDirResults = await Promise.all(
        directories.map(async function (entry) {
            return await recursiveCallback(nodePath.join(dirPath, entry.name));
        }),
    );
    return [...paths, ...subDirResults.flat()];
}

/** Warning: Recursive can be tasking with nested directories. */
async function getFolders(dirPath: string, options?: GetFoldersOptions) {
    if (options !== undefined && typeof options !== "object") {
        throw new Error(`Invalid options: '${options}'. Must be a an object.`);
    }
    const getOptions = { ...DEFAULT_GET_FOLDERS_OPTIONS, ...options };
    const isRecursive = getOptions.isRecursive;
    const processMode = getOptions.processMode;
    if (typeof dirPath !== "string" || dirPath.trim() === "") {
        throw new Error(`Invalid dirPath: '${dirPath}'. Must be a non-empty string.`);
    }
    if (typeof isRecursive !== "boolean") {
        throw new Error(`Invalid isRecursive: '${isRecursive}'. Must be a boolean.`);
    }
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: '${processMode}'. Must be one of string: ${DEFAULT_PROCESS_MODES.join(", ")}`);
    }
    function reduceCallback(acc: string[], entry: Dirent) {
        if (entry.isDirectory()) {
            acc.push(nodePath.join(dirPath, entry.name));
        }
        return acc;
    }
    async function recursiveCallback(subDirPath: string): Promise<string[]> {
        return await getFolders(subDirPath, getOptions);
    }
    return await getPaths(dirPath, isRecursive, processMode, reduceCallback, recursiveCallback);
}

/** Warning: Recursive can be tasking for nested directories. */
async function getModules(dirPath: string, options?: GetModulesOptions) {
    if (options !== undefined && typeof options !== "object") {
        throw new Error(`Invalid options: '${options}'. Must be a an object.`);
    }
    const getOptions = { ...DEFAULT_GET_MODULES_OPTIONS, ...options };
    const isRecursive = getOptions.isRecursive;
    const processMode = getOptions.processMode;
    if (typeof dirPath !== "string" || dirPath.trim() === "") {
        throw new Error(`Invalid dirPath: '${dirPath}'. Must be a non-empty string.`);
    }
    if (typeof isRecursive !== "boolean") {
        throw new Error(`Invalid isRecursive: '${isRecursive}'. Must be a boolean.`);
    }
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: '${processMode}'. Must be one of string: ${DEFAULT_PROCESS_MODES.join(", ")}`);
    }
    function reduceCallback(acc: string[], entry: Dirent) {
        if (entry.isFile() && MODULE_FILE_EXTENSIONS_PATTERN.test(entry.name)) {
            acc.push(nodePath.join(dirPath, entry.name));
        }
        return acc;
    }
    async function recursiveCallback(subDirPath: string): Promise<string[]> {
        return await getModules(subDirPath, getOptions);
    }
    return await getPaths(dirPath, isRecursive, processMode, reduceCallback, recursiveCallback);
}

function getAsyncAwareProcessPathCallback(isLoadCallbackAsync: boolean, loadCallback: LoadFoldersCallback) {
    if (isLoadCallbackAsync) {
        async function processPathAsync(folderPath: string) {
            const folderName = nodePath.basename(folderPath);
            await loadCallback(folderPath, folderName);
        }
        return processPathAsync;
    }
    function processPathSync(folderPath: string) {
        const folderName = nodePath.basename(folderPath);
        loadCallback(folderPath, folderName);
    }
    return processPathSync;
}

async function importModule(fileUrlHref: string, exportType: string, preferredExportName: string) {
    const isNamedExportType = exportType === "named";
    const moduleNamespace: ModuleNamespace = await import(fileUrlHref);
    if (exportType === "all") {
        const moduleExports: ModuleExport[] = [];
        for (const exportName in moduleNamespace) {
            const moduleExport = moduleNamespace[exportName];
            if (!moduleExport || !Object.prototype.hasOwnProperty.call(moduleNamespace, exportName)) {
                console.error(`Invalid module export. Must be a default or named export. Unable to verify export '${exportName}'. Module: ${fileUrlHref}`);
                continue;
            }
            moduleExports.push(moduleExport);
        }
        return moduleExports;
    }
    if (isNamedExportType && preferredExportName === "*") {
        const moduleExports: ModuleExport[] = [];
        for (const exportName in moduleNamespace) {
            const moduleExport = moduleNamespace[exportName];
            if (!moduleExport || !Object.prototype.hasOwnProperty.call(moduleNamespace, exportName) || exportName === DEFAULT_EXPORT_NAME) {
                console.error(`Invalid module export. Must be a named export. Unable to verify named export '${exportName}'. Module: ${fileUrlHref}`);
                continue;
            }
            moduleExports.push(moduleExport);
        }
        return moduleExports;
    }
    const exportName = isNamedExportType ? preferredExportName : DEFAULT_EXPORT_NAME;
    const moduleExport = moduleNamespace[exportName];
    if (!moduleExport || !Object.prototype.hasOwnProperty.call(moduleNamespace, exportName)) {
        const errorMessage = isNamedExportType
            ? `Must be a named export called '${preferredExportName}'. ${exportName === DEFAULT_EXPORT_NAME ? "Unable to verify named export" : "Unable to verify preferred export name"} '${exportName}'.`
            : `Must be a default export. Unable to verify default export '${exportName}'`;
        throw new Error(`Invalid module export. ${errorMessage}. Module: ${fileUrlHref}`);
    }
    return [moduleExport];
}

async function processPaths(paths: string[], processMode: string, processPathCallback: ProcessPathCallback) {
    if (processMode === "concurrent") {
        await Promise.all(paths.map(processPathCallback));
        return;
    }
    for (const path of paths) {
        if (nodeUtilTypes.isAsyncFunction(processPathCallback)) {
            await processPathCallback(path);
            continue;
        }
        processPathCallback(path);
    }
}

async function loadFolders(folderPaths: string[], loadCallback: LoadFoldersCallback, options?: LoadFoldersOptions) {
    if (!Array.isArray(folderPaths)) {
        throw new Error(`Invalid folderPaths: ${folderPaths}. Must be a string array.`);
    }
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: ${loadCallback}. Must be a function.`);
    }
    if (options !== undefined && typeof options !== "object") {
        throw new Error(`Invalid options: '${options}'. Must be a an object.`);
    }
    const loadOptions = { ...DEFAULT_LOAD_FOLDER_OPTIONS, ...options };
    const processMode = loadOptions.processMode;
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be one of string: ${DEFAULT_PROCESS_MODES.join(", ")}`);
    }
    const isLoadCallbackAsync = nodeUtilTypes.isAsyncFunction(loadCallback);
    if (processMode === "concurrent" && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. Process mode: concurrent requires an asynchronous load callback.");
    }
    return await processPaths(folderPaths, processMode, getAsyncAwareProcessPathCallback(isLoadCallbackAsync, loadCallback));
}

async function loadModules(modulePaths: string[], loadCallback: LoadModulesCallback, options?: LoadModulesOptions) {
    if (!Array.isArray(modulePaths)) {
        throw new Error(`Invalid modulePaths: ${modulePaths}. Must be a string array.`);
    }
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: ${loadCallback}. Must be a function.`);
    }
    if (options !== undefined && typeof options !== "object") {
        throw new Error(`Invalid options: '${options}'. Must be a an object.`);
    }
    const loadOptions = { ...DEFAULT_LOAD_MODULE_OPTIONS, ...options };
    const processMode = loadOptions.processMode;
    const exportType = loadOptions.exportType;
    const preferredExportName = loadOptions.preferredExportName;
    const isImportEnabled = loadOptions.isImportEnabled;
    if (!processMode || !DEFAULT_PROCESS_MODES.includes(processMode)) {
        throw new Error(`Invalid process mode: ${processMode}. Must be one of string: ${DEFAULT_PROCESS_MODES.join(", ")}`);
    }
    if (!exportType || !DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid exportType: ${exportType}. Must be one of string: ${DEFAULT_EXPORT_TYPES.join(", ")}`);
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
        if (!isImportEnabled && isLoadCallbackAsync) {
            await loadCallback(null, fileUrlHref, fileName);
            return;
        }
        if (!isImportEnabled && !isLoadCallbackAsync) {
            loadCallback(null, fileUrlHref, fileName);
            return;
        }
        if (!IMPORTABLE_MODULE_FILE_EXTENSIONS_PATTERN.test(fileName)) {
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
