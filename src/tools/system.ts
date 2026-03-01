import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { TriliumClient } from '../client/trilium.js';
import { defineTool } from './schemas.js';
import { exportFormatSchema, backupNameSchema } from './validators.js';
import { TOOL_CATEGORIES, type ToolCategory } from './categories.js';
import { searchTools } from './registry.js';

const searchToolsSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .describe(
      'Search query to find tools. Supports multiple space-separated keywords (AND logic). ' +
        'Searches tool names, descriptions, and parameter names.'
    ),
  category: z
    .enum(TOOL_CATEGORIES)
    .optional()
    .describe('Filter results to a specific tool category'),
  include_schemas: z
    .boolean()
    .optional()
    .describe('Include full input schemas in results (default: false)'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .optional()
    .describe('Maximum number of results to return (default: 10, max: 50)'),
});

const createRevisionSchema = z.object({
  noteId: z
    .string()
    .min(1, 'Note ID is required')
    .describe('ID of the note to create a revision for'),
  format: exportFormatSchema.optional().describe('Format of the revision content (default: html)'),
});

const createBackupSchema = z.object({
  backupName: backupNameSchema.describe(
    'Name for the backup (e.g., "before-migration", "daily-2024-01-15")'
  ),
});

const exportNoteSchema = z.object({
  noteId: z
    .string()
    .min(1, 'Note ID is required')
    .describe('ID of the note to export (use "root" to export entire database)'),
  format: exportFormatSchema
    .optional()
    .describe('Export format - markdown is recommended for LLM processing (default: html)'),
});

export function registerSystemTools(): Tool[] {
  return [
    defineTool(
      'create_revision',
      'Create a revision (snapshot) of a note. Useful before making significant edits to preserve the current state. Revisions can be viewed and restored in Trilium.',
      createRevisionSchema
    ),
    defineTool(
      'create_backup',
      'Create a full database backup. The backup file will be named backup-{backupName}.db and stored in the Trilium data directory. Use before major operations for safety.',
      createBackupSchema
    ),
    defineTool(
      'export_note',
      'Export a note and its subtree as a ZIP file. Returns the export as base64-encoded data. Use format=markdown for LLM-friendly output.',
      exportNoteSchema
    ),
    defineTool(
      'search_tools',
      'Search and filter available MCP tools by keyword. Searches tool names, descriptions, and parameter names. ' +
        'Use this to discover relevant tools when working with large tool sets. ' +
        'Supports multi-keyword AND queries and category filtering.',
      searchToolsSchema
    ),
  ];
}

export async function handleSystemTool(
  client: TriliumClient,
  name: string,
  args: unknown
): Promise<{ content: Array<{ type: 'text'; text: string }> } | null> {
  switch (name) {
    case 'create_revision': {
      const parsed = createRevisionSchema.parse(args);
      await client.createRevision(parsed.noteId, parsed.format ?? 'html');
      return {
        content: [
          {
            type: 'text',
            text: `Revision created for note ${parsed.noteId}. The revision is now available in Trilium's note history.`,
          },
        ],
      };
    }

    case 'create_backup': {
      const parsed = createBackupSchema.parse(args);
      await client.createBackup(parsed.backupName);
      return {
        content: [
          {
            type: 'text',
            text: `Backup created: backup-${parsed.backupName}.db. The backup is stored in Trilium's data directory.`,
          },
        ],
      };
    }

    case 'export_note': {
      const parsed = exportNoteSchema.parse(args);
      const format = parsed.format ?? 'html';
      const data = await client.exportNote(parsed.noteId, format);

      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(data);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                noteId: parsed.noteId,
                format,
                sizeBytes: data.byteLength,
                base64Data: base64,
                note: 'This is a ZIP file encoded as base64. Decode and extract to access the exported notes.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'search_tools': {
      const parsed = searchToolsSchema.parse(args);
      const result = searchTools(parsed.query, {
        category: parsed.category as ToolCategory | undefined,
        include_schemas: parsed.include_schemas,
        limit: parsed.limit,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    default:
      return null;
  }
}
