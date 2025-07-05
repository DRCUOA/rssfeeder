#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node tree-generator.js <source_directory> <output_file>');
    console.error('Example: node tree-generator.js ./my-project ./output/tree.md');
    process.exit(1);
}

const sourceDir = args[0];
const outputFile = args[1];

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory "${sourceDir}" does not exist`);
    process.exit(1);
}

// Create output directory if it doesn't exist
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate unique IDs for nodes
let nodeCounter = 0;
const nodeMap = new Map();

function getNodeId(filePath) {
    if (!nodeMap.has(filePath)) {
        nodeMap.set(filePath, `node${nodeCounter++}`);
    }
    return nodeMap.get(filePath);
}

// Function to sanitize names for Mermaid
function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Function to get file/folder icon based on type
function getIcon(itemPath, isDirectory) {
    if (isDirectory) {
        return '📁';
    }
    
    const ext = path.extname(itemPath).toLowerCase();
    const iconMap = {
        '.js': '📄',
        '.ts': '📄',
        '.jsx': '⚛️',
        '.tsx': '⚛️',
        '.json': '📋',
        '.md': '📝',
        '.html': '🌐',
        '.css': '🎨',
        '.scss': '🎨',
        '.py': '🐍',
        '.java': '☕',
        '.cpp': '⚙️',
        '.c': '⚙️',
        '.h': '⚙️',
        '.sql': '🗄️',
        '.xml': '📋',
        '.yaml': '📋',
        '.yml': '📋',
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.gif': '🖼️',
        '.svg': '🖼️',
        '.pdf': '📕',
        '.txt': '📄',
        '.log': '📋',
        '.env': '🔧',
        '.config': '🔧',
        '.lock': '🔒'
    };
    
    return iconMap[ext] || '📄';
}

// Recursive function to traverse directory tree
function traverseDirectory(dirPath, parentId = null) {
    const items = [];
    const connections = [];
    
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        // Sort entries: directories first, then files
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });
        
        for (const entry of entries) {
            // Skip hidden files and common ignore patterns
            if (entry.name.startsWith('.') && 
                !entry.name.match(/^\.(env|gitignore|gitkeep)$/)) {
                continue;
            }
            
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(sourceDir, fullPath);
            const nodeId = getNodeId(relativePath);
            const icon = getIcon(entry.name, entry.isDirectory());
            const displayName = `${icon} ${entry.name}`;
            
            // Add node definition
            items.push(`    ${nodeId}["${displayName}"]`);
            
            // Add connection to parent if exists
            if (parentId) {
                connections.push(`    ${parentId} --> ${nodeId}`);
            }
            
            // Recursively process subdirectories
            if (entry.isDirectory()) {
                try {
                    const subResult = traverseDirectory(fullPath, nodeId);
                    items.push(...subResult.items);
                    connections.push(...subResult.connections);
                } catch (error) {
                    console.warn(`Warning: Could not read directory ${fullPath}: ${error.message}`);
                }
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not read directory ${dirPath}: ${error.message}`);
    }
    
    return { items, connections };
}

// Main execution
console.log(`Generating tree diagram for: ${sourceDir}`);
console.log(`Output file: ${outputFile}`);

const startTime = Date.now();
const rootName = path.basename(path.resolve(sourceDir));
const rootId = getNodeId('');

// Start traversal
const result = traverseDirectory(sourceDir, rootId);

// Build Mermaid diagram
const mermaidCode = `# Project Tree Diagram

Generated on: ${new Date().toISOString()}
Source: ${path.resolve(sourceDir)}

\`\`\`mermaid
flowchart TD
    ${rootId}["📁 ${rootName}"]
${result.items.join('\n')}

${result.connections.join('\n')}

    classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px
    classDef folder fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef file fill:#fff3e0,stroke:#f57c00,stroke-width:1px
\`\`\`

## Statistics
- Total nodes: ${nodeCounter}
- Generated in: ${Date.now() - startTime}ms
`;

// Write output file
try {
    fs.writeFileSync(outputFile, mermaidCode, 'utf8');
    console.log(`✅ Tree diagram generated successfully!`);
    console.log(`📁 Total nodes processed: ${nodeCounter}`);
    console.log(`⏱️  Generation time: ${Date.now() - startTime}ms`);
    console.log(`📄 Output saved to: ${outputFile}`);
} catch (error) {
    console.error(`❌ Error writing output file: ${error.message}`);
    process.exit(1);
} 