// This script checks the syntax of all .js files under the 'src' directory using Node.js's built-in syntax checking feature

// Import readdir: it allows us to read the contents of a directory asynchronously
import { readdir } from 'node:fs/promises';

// Import spawnSync: it allows us to run a command synchronously in a child process
import { spawnSync } from 'node:child_process';

// Import path: it allows us to work with file and directory paths
import path from 'node:path';

// Recursively find all .js files under a directory
async function filesUnder(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await filesUnder(fullPath));
        else if (entry.name.endsWith('.js')) files.push(fullPath);
    }

    return files;
}

// Check syntax of all .js files under 'src' directory
let failed = false;

for (const file of await filesUnder('src')) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) failed = true;
}

// Set the exit code to 1 if any syntax check failed, otherwise set it to 0
process.exitCode = failed ? 1 : 0;
