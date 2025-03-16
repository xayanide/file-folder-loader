# file-folder-loader
A simple (lowkey over-engineered) utility that wraps around `node:fs/promises#readdir` for reading files and folders and `await import` for importing modules from those files. If you want a simpler approach with the least overhead, just use the former two mentioned inside a standard for-loop, instead of relying on this utility.

# Intro
Instead of manually using `node:fs/promises#readdir` and `await import` together inside for-loops which most often happens with files and folders, some functions of this utility abstracts that logic away. An abstraction over for-loops approach of iterating and loading files and folders. Syntactic sugar for iterating and loading folders and files. All functions are only asynchronous and returns a Promise.

## Installation

```sh
npm install file-folder-loader
```

## Usage & Examples

> [!WARNING]
> By default, `isImportEnabled` is `true` when using `loadModulePaths()`. The module blindly imports modules unsandboxed. Only import modules from places you know. Modules that self-invoke code as soon as they're imported can have dangerous side-effects.

### Example 1: Loading Folder Paths

```typescript
import * as nodeUrl from "node:url";
import * as nodePath from "node:path";
import { getFolderPaths, loadFolderPaths } from "file-folder-loader";

function getDirname(moduleAbsoluteFileUrl) {
    const fileName = nodeUrl.fileURLToPath(moduleAbsoluteFileUrl);
    return nodePath.dirname(fileName);
}

async function init() {
    const dirPath = nodePath.join(getDirname(import.meta.url), "someDirectory");
    const folderPaths = await getFolderPaths(dirPath);
    if (folderPaths.length > 0) {
        await loadFolderPaths(folderPaths, async (folderPath, folderName) => {
            console.log(`Loaded folder ${folderName} from path: ${folderPath}`);
        });
    }
}

await init();
```

### Example 2: Loading Module Paths

```typescript
import * as nodeUrl from "node:url";
import * as nodePath from "node:path";
import { getModulePaths, loadModulePaths } from "file-folder-loader";

function getDirname(moduleAbsoluteFileUrl) {
    const fileName = nodeUrl.fileURLToPath(moduleAbsoluteFileUrl);
    return nodePath.dirname(fileName);
}

async function init() {
    const dirPath = nodePath.join(getDirname(import.meta.url), "someDirectory");
    const modulePaths = await getModulePaths(dirPath);
    if (modulePaths.length > 0) {
        await loadModulePaths(modulePaths, async (moduleExport, fileUrlHref, fileName) => {
            console.log(`Loaded module ${fileName} from path: ${fileUrlHref}`);
            console.log(`Module export:`, moduleExport);
        });
    }
}

await init();
```

### Example 3: Loading Folder Paths Sequentially and Loading Module Paths Concurrently (All recursive)

```typescript
import * as nodeUrl from "node:url";
import * as nodePath from "node:path";
import { getFolderPaths, getModulePaths, loadFolderPaths, loadModulePaths } from "file-folder-loader";

function getDirname(moduleAbsoluteFileUrl) {
    const fileName = nodeUrl.fileURLToPath(moduleAbsoluteFileUrl);
    return nodePath.dirname(fileName);
}

async function init() {
    const dirPath = nodePath.join(getDirname(import.meta.url), "someDirectory");
    // getFolderPaths option isRecursive = false by default
    const folderPaths = await getFolderPaths(dirPath, { isRecursive: true });
    if (folderPaths.length > 0) {
        await loadFolderPaths(folderPaths, async (folderPath, folderName) => {
            console.log(`Loaded folder ${folderName} from path: ${folderPath}`);
            // getModulePaths option isRecursive = false by default
            const modulePaths = await getModulePaths(folderPath, { isRecursive: true });
            if (modulePaths.length > 0) {
                await loadModulePaths(modulePaths, async (moduleExport, fileUrlHref, fileName) => {
                    console.log(`Loaded module ${fileName} from path: ${fileUrlHref}`);
                    // moduleExport will be null because isImportEnabled is false (true by default)
                    console.log(`Module export:`, moduleExport);
                }, { isImportEnabled: false });
            }
        }, { isConcurrent: false });
    }
}

await init();
```

## Use Cases

- **Discord Bots**: Load folders and files dynamically,
- **Modular Applications**: Load user-defined files and folders dynamically.

## The project's core tech stack
- [TypeScript](https://www.typescriptlang.org) - Programming language, a superset of JavaScript
- [JavaScript](https://en.wikipedia.org/wiki/JavaScript) - Programming language
- [Node.js](https://github.com/nodejs/node) - JavaScript runtime

## The project incorporates the following tools
- [eslint](https://github.com/eslint/eslint) - Code linting
- [prettier](https://github.com/prettier/prettier) - Code formatting
- [commitlint](https://github.com/conventional-changelog/commitlint) - Enforcing commit message conventions
- [semantic-release](https://github.com/semantic-release/semantic-release) - Automated versioning and releases
