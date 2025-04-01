import * as nodeFsPromises from "node:fs/promises";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeUtilTypes from "node:util/types";
import type {
    GetFolderPathsOptions,
    GetModulePathsOptions,
    LoadFolderPathsOptions,
    LoadFolderPathsCallback,
    LoadModulePathsOptions,
    LoadModulePathsCallback,
    LoadFolderModulesCallback,
    LoadFolderModulesOptions,
    ModuleExport,
    ModuleNamespace,
    ProcessItemPathCallback,
    ProcessFileCallback,
    ProcessFolderPathsOptions,
} from "./types.js";
import type { Dirent } from "node:fs";

const MODULE_FILE_EXTENSIONS_PATTERN = /\.(m?js|cjs|mts|cts|ts|jsx|tsx)$/;
const IMPORTABLE_MODULE_FILE_EXTENSIONS_PATTERN = /\.(m?js|cjs|mts|cts)$/;

const DEFAULT_EXPORT_NAME = "default";

const DEFAULT_EXPORT_TYPE = "default";
const DEFAULT_PREFERRED_EXPORT_NAME = "default";

const DEFAULT_EXPORT_TYPES = ["default", "named", "all"];

const DEFAULT_GET_MODULES_PATHS_OPTIONS = {
    isRecursive: false,
    isConcurrent: true,
};

const DEFAULT_GET_FOLDERS_PATHS_OPTIONS = {
    isRecursive: false,
    isConcurrent: true,
};

const DEFAULT_LOAD_MODULE_PATHS_OPTIONS = {
    isConcurrent: true,
    exportType: DEFAULT_EXPORT_TYPE,
    preferredExportName: DEFAULT_PREFERRED_EXPORT_NAME,
    isImportEnabled: true,
};

const DEFAULT_LOAD_FOLDER_MODULES_OPTIONS = {
    isFileConcurrent: true,
    isFolderConcurrent: true,
    exportType: DEFAULT_EXPORT_TYPE,
    preferredExportName: DEFAULT_PREFERRED_EXPORT_NAME,
    isImportEnabled: true,
};

const DEFAULT_LOAD_FOLDER_PATHS_OPTIONS = {
    isConcurrent: true,
};

const DEFAULT_PROCESS_FOLDER_PATHS_OPTIONS = {
    isFileConcurrent: false,
    isFolderConcurrent: false,
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

function isModuleFileExtensionName(entry: Dirent) {
    return MODULE_FILE_EXTENSIONS_PATTERN.test(entry.name);
}

function getMergedOptions<T>(userOptions: Partial<T> | undefined, defaultOptions: T): T {
    if (userOptions !== undefined && (userOptions === null || typeof userOptions !== "object" || Array.isArray(userOptions))) {
        throw new Error(`Invalid options: '${userOptions}'. Must be a an object.`);
    }
    return { ...defaultOptions, ...(userOptions || {}) };
}

async function readDirectory(dirPath: string) {
    try {
        return await nodeFsPromises.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
        handleError(`Failed to read directory. Directory path: ${dirPath}`, error);
        return [];
    }
}

async function getItemPaths(
    dirPath: string,
    isRecursive: boolean,
    isConcurrent: boolean,
    reduceCallback: (acc: string[], entry: Dirent) => string[],
    recursiveCallback: (subDirPath: string) => Promise<string[]>,
) {
    const entries = await readDirectory(dirPath);
    const itemPaths = entries.reduce<string[]>(reduceCallback, []);
    if (!isRecursive) {
        return itemPaths;
    }
    const directories = entries.filter(function (entry) {
        return entry.isDirectory();
    });
    /**
     * itemPaths.push(...results) is possible for a mutable approach
     * but decided not to go with it to avoid side-effects.
     */
    if (isConcurrent) {
        const subDirResults = await Promise.all(
            directories.map(async function (entry) {
                return await recursiveCallback(nodePath.join(dirPath, entry.name));
            }),
        );
        return [...itemPaths, ...subDirResults.flat()];
    }
    const results: string[] = [];
    for (const entry of directories) {
        const subDirPath = nodePath.join(dirPath, entry.name);
        const subDirResults = await recursiveCallback(subDirPath);
        results.push(...subDirResults);
    }
    return [...itemPaths, ...results];
}

/** Warning: There is no concurrency limit with recursive and can be demanding with nested directories. */
async function getModulePaths(
    dirPath: string,
    options?: GetModulePathsOptions,
    filterCallback: (entry: Dirent, fullFilePath?: string, directoryPath?: string) => boolean = isModuleFileExtensionName,
) {
    const userOptions = getMergedOptions(options, DEFAULT_GET_MODULES_PATHS_OPTIONS);
    const isRecursive = userOptions.isRecursive;
    const isConcurrent = userOptions.isConcurrent;
    if (typeof dirPath !== "string" || dirPath.trim() === "") {
        throw new Error(`Invalid dirPath: '${dirPath}'. Must be a non-empty string.`);
    }
    if (typeof isRecursive !== "boolean") {
        throw new Error(`Invalid isRecursive: '${isRecursive}'. Must be a boolean.`);
    }
    if (typeof isConcurrent !== "boolean") {
        throw new Error(`Invalid isConcurrent: '${isConcurrent}'. Must be a boolean.`);
    }
    function reduceCallback(acc: string[], entry: Dirent) {
        const fullFilePath = nodePath.join(dirPath, entry.name);
        if (entry.isFile() && filterCallback(entry, fullFilePath, dirPath)) {
            acc.push(fullFilePath);
        }
        return acc;
    }
    async function recursiveCallback(subDirPath: string): Promise<string[]> {
        return await getModulePaths(subDirPath, userOptions);
    }
    return await getItemPaths(dirPath, isRecursive, isConcurrent, reduceCallback, recursiveCallback);
}

/** Warning: There is no concurrency limit with recursive and can be demanding with nested directories. */
async function getFolderPaths(
    dirPath: string,
    options?: GetFolderPathsOptions,
    filterCallback?: (entry: Dirent, fullFolderPath?: string, directoryPath?: string) => boolean,
) {
    const userOptions = getMergedOptions(options, DEFAULT_GET_FOLDERS_PATHS_OPTIONS);
    const isRecursive = userOptions.isRecursive;
    const isConcurrent = userOptions.isConcurrent;
    if (typeof dirPath !== "string" || dirPath.trim() === "") {
        throw new Error(`Invalid dirPath: '${dirPath}'. Must be a non-empty string.`);
    }
    if (typeof isRecursive !== "boolean") {
        throw new Error(`Invalid isRecursive: '${isRecursive}'. Must be a boolean.`);
    }
    if (typeof isConcurrent !== "boolean") {
        throw new Error(`Invalid isConcurrent: '${isConcurrent}'. Must be a boolean.`);
    }
    function reduceCallback(acc: string[], entry: Dirent) {
        const fullFolderPath = nodePath.join(dirPath, entry.name);
        const isDirectory = entry.isDirectory();
        if (isDirectory || (isDirectory && filterCallback && filterCallback(entry, fullFolderPath, dirPath))) {
            acc.push(fullFolderPath);
        }
        return acc;
    }
    async function recursiveCallback(subDirPath: string): Promise<string[]> {
        return await getFolderPaths(subDirPath, userOptions);
    }
    return await getItemPaths(dirPath, isRecursive, isConcurrent, reduceCallback, recursiveCallback);
}

/**
 * This is necessary because I need the user-provided callback to be properly awaited
 * or not awaited if it's just a non-async function
 **/
function getAsyncAwareProcessFolderPathCallback(isProcessFolderPathAsync: boolean, processFolderPath: LoadFolderPathsCallback) {
    if (isProcessFolderPathAsync) {
        async function processItemPathAsync(folderPath: string) {
            if (typeof folderPath !== "string" || folderPath.trim() === "") {
                throw new Error(`Invalid folder path: '${folderPath}'. Must be a non-empty string.`);
            }
            const folderName = nodePath.basename(folderPath);
            await processFolderPath(folderPath, folderName);
        }
        return processItemPathAsync;
    }
    function processItemPathSync(folderPath: string) {
        if (typeof folderPath !== "string" || folderPath.trim() === "") {
            throw new Error(`Invalid folder path: '${folderPath}'. Must be a non-empty string.`);
        }
        const folderName = nodePath.basename(folderPath);
        processFolderPath(folderPath, folderName);
    }
    return processItemPathSync;
}

async function importModule(fileUrlHref: string, exportType: string, preferredExportName: string) {
    const isNamedExportType = exportType === "named";
    /**
     * There is no need to check if moduleNamespace
     * is undefined or null because it'll always return an empty object
     * if there's nothing to export.
     */
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

async function processFolderPaths(folderPaths: string | string[], processFile: ProcessFileCallback, options?: ProcessFolderPathsOptions) {
    if (!Array.isArray(folderPaths)) {
        if (typeof folderPaths === "string" && folderPaths.trim() !== "") {
            folderPaths = [folderPaths];
        } else {
            throw new Error(`Invalid folderPaths: '${folderPaths}'. Must be a non-empty string or a string[].`);
        }
    }
    if (folderPaths.length === 0) {
        return;
    }
    if (typeof processFile !== "function") {
        throw new Error("Invalid processFile callback. Must be a function.");
    }
    const userOptions = getMergedOptions(options, DEFAULT_PROCESS_FOLDER_PATHS_OPTIONS);
    const isFileConcurrent = userOptions.isFileConcurrent;
    const isFolderConcurrent = userOptions.isFolderConcurrent;
    if (typeof isFileConcurrent !== "boolean") {
        throw new Error(`Invalid isFileConcurrent: '${isFileConcurrent}'. Must be a boolean.`);
    }
    if (typeof isFolderConcurrent !== "boolean") {
        throw new Error(`Invalid isFolderConcurrent: '${isFolderConcurrent}'. Must be a boolean.`);
    }
    const isProcessFileAsync = nodeUtilTypes.isAsyncFunction(processFile);
    if (isFileConcurrent && !isProcessFileAsync) {
        throw new Error("Invalid processFile callback. isFileConcurrent: true requires an async callback");
    }
    async function processFolderPath(folderPath: string) {
        if (typeof folderPath !== "string" || folderPath.trim() === "") {
            throw new Error(`Invalid folderPath: '${folderPath}'. Must be a non-empty string.`);
        }
        const files = await nodeFsPromises.readdir(folderPath, { withFileTypes: true });
        if (files.length === 0) {
            return;
        }
        if (files.length === 1) {
            const file = files[0];
            if (!file) {
                return;
            }
            if (isProcessFileAsync) {
                await processFile(file, folderPath);
                return;
            }
            processFile(file, folderPath);
            return;
        }
        if (isFileConcurrent) {
            await Promise.all(
                files.map(async function (file) {
                    return await processFile(file, folderPath);
                }),
            );
            return;
        }
        for (const file of files) {
            if (isProcessFileAsync) {
                await processFile(file, folderPath);
                continue;
            }
            processFile(file, folderPath);
        }
    }
    if (folderPaths.length === 1) {
        const folderPath = folderPaths[0];
        if (typeof folderPath !== "string" || folderPath.trim() === "") {
            throw new Error(`Invalid folderPath: '${folderPath}'. Must be a non-empty string.`);
        }
        await processFolderPath(folderPath);
        return;
    }
    if (isFolderConcurrent) {
        await Promise.all(folderPaths.map(processFolderPath));
        return;
    }
    for (const folderPath of folderPaths) {
        await processFolderPath(folderPath);
    }
}

async function processItemPaths(paths: string[], isConcurrent: boolean, processItemPathCallback: ProcessItemPathCallback, isLoadCallbackAsync: boolean) {
    if (paths.length === 0) {
        return;
    }
    if (paths.length === 1) {
        const path = paths[0];
        if (!path) {
            return;
        }
        if (isLoadCallbackAsync) {
            await processItemPathCallback(path);
            return;
        }
        processItemPathCallback(path);
        return;
    }
    if (isConcurrent) {
        await Promise.all(paths.map(processItemPathCallback));
        return;
    }
    for (const path of paths) {
        if (isLoadCallbackAsync) {
            await processItemPathCallback(path);
            continue;
        }
        processItemPathCallback(path);
    }
}

async function loadModulePaths(modulePaths: string[], loadCallback: LoadModulePathsCallback, options?: LoadModulePathsOptions) {
    if (!Array.isArray(modulePaths)) {
        throw new Error(`Invalid paths: '${modulePaths}'. Must be an array.`);
    }
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: '${loadCallback}'. Must be a function.`);
    }
    const userOptions = getMergedOptions(options, DEFAULT_LOAD_MODULE_PATHS_OPTIONS);
    const isConcurrent = userOptions.isConcurrent;
    const exportType = userOptions.exportType;
    const preferredExportName = userOptions.preferredExportName;
    const isImportEnabled = userOptions.isImportEnabled;
    if (typeof isConcurrent !== "boolean") {
        throw new Error(`Invalid isConcurrent: '${isConcurrent}'. Must be a boolean.`);
    }
    if (!DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid exportType: '${exportType}'. Must be one of string: ${DEFAULT_EXPORT_TYPES.join(", ")}`);
    }
    if (typeof preferredExportName !== "string" || preferredExportName.trim() === "") {
        throw new Error(`Invalid preferred export name: '${preferredExportName}'. Must be a non-empty string.`);
    }
    if (typeof isImportEnabled !== "boolean") {
        throw new Error(`Invalid isImportEnabled: '${isImportEnabled}'. Must be a boolean.`);
    }
    const isLoadCallbackAsync = nodeUtilTypes.isAsyncFunction(loadCallback);
    if (isConcurrent && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. isConcurrent: 'true' requires an async callback.");
    }
    async function processItemPath(filePath: string) {
        if (typeof filePath !== "string" || filePath.trim() === "") {
            throw new Error(`Invalid module path: '${filePath}'. Must be a non-empty string.`);
        }
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
    return await processItemPaths(modulePaths, isConcurrent, processItemPath, isLoadCallbackAsync);
}

async function loadFolderPaths(folderPaths: string[], loadCallback: LoadFolderPathsCallback, options?: LoadFolderPathsOptions) {
    if (!Array.isArray(folderPaths)) {
        throw new Error(`Invalid paths: '${folderPaths}'. Must be an array.`);
    }
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: '${loadCallback}'. Must be a function.`);
    }
    const userOptions = getMergedOptions(options, DEFAULT_LOAD_FOLDER_PATHS_OPTIONS);
    const isConcurrent = userOptions.isConcurrent;
    if (typeof isConcurrent !== "boolean") {
        throw new Error(`Invalid isConcurrent: '${isConcurrent}'. Must be a boolean.`);
    }
    const isLoadCallbackAsync = nodeUtilTypes.isAsyncFunction(loadCallback);
    if (isConcurrent && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. isConcurrent: 'true' requires an async callback.");
    }
    return await processItemPaths(folderPaths, isConcurrent, getAsyncAwareProcessFolderPathCallback(isLoadCallbackAsync, loadCallback), isLoadCallbackAsync);
}

async function loadFolderModules(folderPaths: string | string[], loadCallback: LoadFolderModulesCallback, options?: LoadFolderModulesOptions) {
    if (typeof loadCallback !== "function") {
        throw new Error(`Invalid load callback: '${loadCallback}'. Must be a function.`);
    }
    const userOptions = getMergedOptions(options, DEFAULT_LOAD_FOLDER_MODULES_OPTIONS);
    const isFileConcurrent = userOptions.isFileConcurrent;
    const isFolderConcurrent = userOptions.isFolderConcurrent;
    const exportType = userOptions.exportType;
    const preferredExportName = userOptions.preferredExportName;
    const isImportEnabled = userOptions.isImportEnabled;
    if (typeof isFileConcurrent !== "boolean") {
        throw new Error(`Invalid isFolderConcurrent: '${isFolderConcurrent}'. Must be a boolean.`);
    }
    if (typeof isFolderConcurrent !== "boolean") {
        throw new Error(`Invalid isFolderConcurrent: '${isFolderConcurrent}'. Must be a boolean.`);
    }
    if (!DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid exportType: '${exportType}'. Must be one of string: ${DEFAULT_EXPORT_TYPES.join(", ")}`);
    }
    if (typeof preferredExportName !== "string" || preferredExportName.trim() === "") {
        throw new Error(`Invalid preferred export name: '${preferredExportName}'. Must be a non-empty string.`);
    }
    if (typeof isImportEnabled !== "boolean") {
        throw new Error(`Invalid isImportEnabled: '${isImportEnabled}'. Must be a boolean.`);
    }
    const isLoadCallbackAsync = nodeUtilTypes.isAsyncFunction(loadCallback);
    if (isFileConcurrent && !isLoadCallbackAsync) {
        throw new Error("Invalid load callback. isFileConcurrent: 'true' requires an async callback.");
    }
    async function processFile(file: Dirent, folderPath: string) {
        const fileName = file.name;
        const filePath = nodePath.join(folderPath, fileName);
        const fileUrlHref = nodeUrl.pathToFileURL(filePath).href;
        if (!isImportEnabled && isLoadCallbackAsync) {
            await loadCallback(null, fileUrlHref, fileName, folderPath, file);
            return;
        }
        if (!isImportEnabled && !isLoadCallbackAsync) {
            loadCallback(null, fileUrlHref, fileName, folderPath, file);
            return;
        }
        if (!IMPORTABLE_MODULE_FILE_EXTENSIONS_PATTERN.test(fileName)) {
            return;
        }
        const moduleExports = await importModule(fileUrlHref, exportType, preferredExportName);
        for (const moduleExport of moduleExports) {
            if (isLoadCallbackAsync) {
                await loadCallback(moduleExport, fileUrlHref, fileName, folderPath, file);
                continue;
            }
            loadCallback(moduleExport, fileUrlHref, fileName, folderPath, file);
        }
    }
    await processFolderPaths(folderPaths, processFile, { isFileConcurrent: isFileConcurrent, isFolderConcurrent: isFolderConcurrent });
}

export default { getModulePaths, getFolderPaths, loadModulePaths, loadFolderPaths, loadFolderModules, processFolderPaths };
export { getModulePaths, getFolderPaths, loadModulePaths, loadFolderPaths, loadFolderModules, processFolderPaths };
