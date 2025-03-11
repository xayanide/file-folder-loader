# file-folder-loader
A simple utility for iterating over folders and files and importing modules from those files. An abstraction over for-loops approach of loading files and folders. Syntactic sugar for iterating and loading folders and files.

## Installation

```sh
npm install file-folder-loader
```

## Usage & Examples

### Example 1: Loading Folders

```typescript
import { getFolders, loadFolders } from "file-folder-loader";

async function init() {
    const dirPath = "./some-directory";
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
import { getModules, loadModules } from "file-folder-loader";

async function init() {
    const dirPath = "./some-directory";
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
import { getFolders, getModules, loadFolders, loadModules } from "file-folder-loader";

async function init() {
    const dirPath = "./some-directory";
    const folderPaths = await getFolders(dirPath);
    if (folderPaths.length > 0) {
        await loadFolders(folderPaths, async (folderPath, folderName) => {
            console.log(`Loaded folder ${folderName} from path: ${folderPath}`);
            const modulePaths = await getModules(folderPath);
            if (modulePaths.length > 0) {
                await loadModules(modulePaths, async (moduleExport, moduleFileUrlHref, moduleFileName) => {
                    console.log(`Loaded module ${moduleFileName} from path: ${moduleFileUrlHref}`);
                    console.log(`Module export:`, moduleExport);
                });
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
