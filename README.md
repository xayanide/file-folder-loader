# file-folder-loader
A simple utility for iterating over folders and files and importing modules from those files. An abstraction over for-loops approach of loading files and folders. Syntactic sugar for iterating and loading folders and files.

## Installation

```sh
npm install file-folder-loader
```

## Usage & Examples

### Example 1: Loading Folders

```typescript
import * as nodeUrl from "node:url";
import * as nodePath from "node:path";
import { getFolders, loadFolders } from "file-folder-loader";

function getDirname(moduleAbsoluteFileUrl) {
    const fileName = nodeUrl.fileURLToPath(moduleAbsoluteFileUrl);
    return nodePath.dirname(fileName);
}

async function init() {
    const dirPath = nodePath.join(getDirname(import.meta.url), "someDirectory");
    const folderPaths = await getFolders(dirPath);
    if (folderPaths.length > 0) {
        await loadFolders(folderPaths, async (folderPath, folderName) => {
            console.log(`Loaded folder ${folderName} from path: ${folderPath}`);
        });
    }
}

await init();
```

### Example 2: Loading Modules

```typescript
import * as nodeUrl from "node:url";
import * as nodePath from "node:path";
import { getModules, loadModules } from "file-folder-loader";

function getDirname(moduleAbsoluteFileUrl) {
    const fileName = nodeUrl.fileURLToPath(moduleAbsoluteFileUrl);
    return nodePath.dirname(fileName);
}

async function init() {
    const dirPath = nodePath.join(getDirname(import.meta.url), "someDirectory");
    const modulePaths = await getModules(dirPath);
    if (modulePaths.length > 0) {
        await loadModules(modulePaths, async (moduleExport, moduleFileUrlHref, moduleFileName) => {
            console.log(`Loaded module ${moduleFileName} from path: ${moduleFileUrlHref}`);
            console.log(`Module export:`, moduleExport);
        });
    }
}

await init();
```

### Example 3: Loading Folders Sequentially and Loading Modules Concurrently

```typescript
import * as nodeUrl from "node:url";
import * as nodePath from "node:path";
import { getFolders, getModules, loadFolders, loadModules } from "file-folder-loader";

function getDirname(moduleAbsoluteFileUrl) {
    const fileName = nodeUrl.fileURLToPath(moduleAbsoluteFileUrl);
    return nodePath.dirname(fileName);
}

async function init() {
    const dirPath = nodePath.join(getDirname(import.meta.url), "someDirectory");
    // Recursive = false by default
    const folderPaths = await getFolders(dirPath);
    if (folderPaths.length > 0) {
        await loadFolders(folderPaths, async (folderPath, folderName) => {
            console.log(`Loaded folder ${folderName} from path: ${folderPath}`);
            // Recursive = false by default
            const modulePaths = await getModules(folderPath, false);
            if (modulePaths.length > 0) {
                await loadModules(modulePaths, async (moduleExport, moduleFileUrlHref, moduleFileName) => {
                    console.log(`Loaded module ${moduleFileName} from path: ${moduleFileUrlHref}`);
                    // moduleExport will be null because isImportEnabled is false (true by default)
                    console.log(`Module export:`, moduleExport);
                }, { isImportEnabled: false });
            }
        }, { processMode: "sequential" });
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
