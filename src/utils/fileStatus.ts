
/**
 * @file Utility for tracking file status in the database
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags file-status, utilities
 * @dependencies supabase/client
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export type FileStatus = 'active' | 'deprecated' | 'experimental';

export interface FileStatusRecord {
  id: string;
  file_path: string;
  status: FileStatus;
  last_used: string;
  version?: string;
  tags?: string[];
  dependencies?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Get the status of a file from the database
 * @param filePath Path to the file
 */
export async function getFileStatus(filePath: string): Promise<FileStatusRecord | null> {
  try {
    const { data, error } = await supabase
      .from('file_status')
      .select('*')
      .eq('file_path', filePath)
      .single();

    if (error) {
      console.error(`Error fetching file status for ${filePath}:`, error);
      return null;
    }

    return data as FileStatusRecord;
  } catch (error) {
    console.error(`Unexpected error fetching file status for ${filePath}:`, error);
    return null;
  }
}

/**
 * Get all file status records
 * @param status Optional status filter
 */
export async function getAllFileStatuses(status?: FileStatus): Promise<FileStatusRecord[]> {
  try {
    let query = supabase
      .from('file_status')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching file statuses:`, error);
      return [];
    }

    return data as FileStatusRecord[];
  } catch (error) {
    console.error(`Unexpected error fetching file statuses:`, error);
    return [];
  }
}

/**
 * Update the file status in the database
 * @param filePath Path to the file
 * @param status New status
 * @param version Optional version
 * @param tags Optional tags
 * @param dependencies Optional dependencies
 */
export async function updateFileStatus(
  filePath: string,
  status: FileStatus,
  version?: string,
  tags?: string[],
  dependencies?: string[]
): Promise<boolean> {
  try {
    // Check if file status exists
    const existingStatus = await getFileStatus(filePath);
    
    if (existingStatus) {
      // Update existing record
      const { error } = await supabase
        .from('file_status')
        .update({
          status,
          last_used: new Date().toISOString(),
          version,
          tags,
          dependencies
        })
        .eq('file_path', filePath);

      if (error) {
        console.error(`Error updating file status for ${filePath}:`, error);
        toast({
          title: "Error",
          description: `Failed to update file status for ${filePath}`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    } else {
      // Create new record
      const { error } = await supabase
        .from('file_status')
        .insert({
          file_path: filePath,
          status,
          last_used: new Date().toISOString(),
          version,
          tags,
          dependencies
        });

      if (error) {
        console.error(`Error creating file status for ${filePath}:`, error);
        toast({
          title: "Error",
          description: `Failed to create file status for ${filePath}`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error(`Unexpected error updating file status for ${filePath}:`, error);
    toast({
      title: "Error",
      description: `Unexpected error updating file status for ${filePath}`,
      variant: "destructive"
    });
    return false;
  }
}

/**
 * Get files by tag
 * @param tag Tag to filter by
 */
export async function getFilesByTag(tag: string): Promise<FileStatusRecord[]> {
  try {
    const { data, error } = await supabase
      .from('file_status')
      .select('*')
      .contains('tags', [tag]);

    if (error) {
      console.error(`Error fetching files by tag ${tag}:`, error);
      return [];
    }

    return data as FileStatusRecord[];
  } catch (error) {
    console.error(`Unexpected error fetching files by tag ${tag}:`, error);
    return [];
  }
}

/**
 * Get all deprecated files
 */
export async function getDeprecatedFiles(): Promise<FileStatusRecord[]> {
  return getAllFileStatuses('deprecated');
}

/**
 * Get all experimental files
 */
export async function getExperimentalFiles(): Promise<FileStatusRecord[]> {
  return getAllFileStatuses('experimental');
}

/**
 * Parse file header comments to extract status information
 * @param content File content
 */
export function parseFileStatusComment(content: string): {
  status?: FileStatus;
  lastUsed?: string;
  version?: string;
  tags?: string[];
  dependencies?: string[];
} {
  // Regular expressions to extract information from file header comments
  const statusRegex = /@status\s+(\w+)/;
  const lastUsedRegex = /@lastUsed\s+(\d{4}-\d{2}-\d{2})/;
  const versionRegex = /@version\s+(.+)$/m;
  const tagsRegex = /@tags\s+(.+)$/m;
  const dependenciesRegex = /@dependencies\s+(.+)$/m;

  // Extract information
  const statusMatch = content.match(statusRegex);
  const lastUsedMatch = content.match(lastUsedRegex);
  const versionMatch = content.match(versionRegex);
  const tagsMatch = content.match(tagsRegex);
  const dependenciesMatch = content.match(dependenciesRegex);

  // Return extracted information
  return {
    status: statusMatch ? statusMatch[1] as FileStatus : undefined,
    lastUsed: lastUsedMatch ? lastUsedMatch[1] : undefined,
    version: versionMatch ? versionMatch[1] : undefined,
    tags: tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim()) : undefined,
    dependencies: dependenciesMatch ? dependenciesMatch[1].split(',').map(dep => dep.trim()) : undefined,
  };
}

/**
 * Generate a file status comment
 * @param description File description
 * @param status File status
 * @param lastUsed Last used date
 * @param version File version
 * @param tags File tags
 * @param dependencies File dependencies
 */
export function generateFileStatusComment(
  description: string,
  status: FileStatus = 'active',
  lastUsed: string = new Date().toISOString().split('T')[0],
  version: string = '1.0',
  tags: string[] = [],
  dependencies: string[] = []
): string {
  return `/**
 * @file ${description}
 * @status ${status}
 * @lastUsed ${lastUsed}
 * @version ${version}
 * @tags ${tags.join(', ')}
 * @dependencies ${dependencies.join(', ')}
 */`;
}
