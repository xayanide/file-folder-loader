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

async function exampleLoadFolders() {
    const dirPath = "./some-directory";
    const folders = await getFolders(dirPath);
    // just to demo that it is a string array
    if (folders.length > 0) {
        await loadFolders(folders, dirPath, (folderName, folderPath) => {
            console.log(`Loaded folder: ${folderName} at path: ${folderPath}`);
        });
    }
}

await exampleLoadFolders();
```

### Example 2: Loading Modules

```typescript
import { getModules, loadModules } from "file-folder-loader";

async function exampleLoadModules() {
    const dirPath = "./some-directory";
    const modules = await getModules(dirPath);
    // just to demo that it is a string array
    if (modules.length > 0) {
        await loadModules(modules, dirPath, (moduleExport, modulePath, moduleFileName) => {
            console.log(`Loaded module: ${moduleFileName} from path: ${modulePath}`);
            console.log(`Module export:`, moduleExport);
        });
    }
}

await exampleLoadModules();
```

### Example 3: Loading Folders and Modules Sequentially

```typescript
import { getFolders, loadFolders, getModules, loadModules } from "file-folder-loader";

async function exampleLoadFoldersAndModules() {
    const dirPath = "./some-directory";
    const folders = await getFolders(dirPath);
    // just to demo that it is a string array
    if (folders.length > 0) {
        await loadFolders(folders, dirPath, async (folderName, folderPath) => {
            console.log(`Loaded folder: ${folderName} at path: ${folderPath}`);
            const modules = await getModules(folderPath);
            // just to demo that it is a string array
            if (modules.length > 0) {
                await loadModules(modules, folderPath, (moduleExport, modulePath, moduleFileName) => {
                    console.log(`Loaded module: ${moduleFileName} from path: ${modulePath}`);
                    console.log(`Module export:`, moduleExport);
                });
            }
        }, { processMode: "sequential" });
    }
}

await exampleLoadFoldersAndModules();
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
