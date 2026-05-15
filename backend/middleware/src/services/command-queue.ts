/**
 * Terminal Command Queue Service
 * 
 * Persistent, database-backed command queue for ZKTeco terminals.
 * Replaces the in-memory commandQueue and (global as any).cmdTracker.
 * 
 * Commands survive server restarts and provide a full audit trail.
 */

import { getSupabase } from './supabase';
import { logger } from '../utils/logger';

export interface QueuedCommand {
    id: string;
    terminal_sn: string;
    command_id: number;
    command_type: string;
    command_payload: string;
    description: string | null;
    status: string;
    priority: number;
    retry_count: number;
    max_retries: number;
    response_code: number | null;
    error_message: string | null;
    created_at: string;
    sent_at: string | null;
    completed_at: string | null;
}

// Command types for consistent usage
export const CMD_TYPES = {
    USER_SYNC: 'USER_SYNC',
    FINGERPRINT_SYNC: 'FINGERPRINT_SYNC',
    TIME_SYNC: 'TIME_SYNC',
    RAW: 'RAW',
    FORMAT_TEST: 'FORMAT_TEST',
} as const;

/**
 * Generate a random command ID for ZKTeco protocol
 */
function newCmdId(): number {
    return Math.floor(Math.random() * 10000);
}

/**
 * Enqueue a command for a terminal.
 * Returns the generated command ID.
 */
export async function enqueueCommand(
    terminalSn: string,
    commandType: string,
    commandPayload: string,
    description?: string,
    priority: number = 0
): Promise<number> {
    const supabase = getSupabase();
    const cmdId = newCmdId();

    const { error } = await supabase
        .from('terminal_command_queue')
        .insert({
            terminal_sn: terminalSn,
            command_id: cmdId,
            command_type: commandType,
            command_payload: commandPayload,
            description: description || null,
            priority,
            status: 'pending',
        });

    if (error) {
        logger.error(`[CommandQueue] Failed to enqueue command for ${terminalSn}:`, error);
        throw error;
    }

    logger.info(`[CommandQueue] Enqueued ${commandType} for ${terminalSn} (cmdId: ${cmdId})`);
    return cmdId;
}

/**
 * Get the next pending command for a terminal.
 * Marks it as 'sent' atomically.
 * Returns null if no commands are pending.
 */
export async function getNextCommand(terminalSn: string): Promise<QueuedCommand | null> {
    const supabase = getSupabase();

    // Fetch oldest pending command with highest priority
    const { data, error } = await supabase
        .from('terminal_command_queue')
        .select('*')
        .eq('terminal_sn', terminalSn)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        logger.error(`[CommandQueue] Failed to fetch next command for ${terminalSn}:`, error);
        return null;
    }

    if (!data) return null;

    // Mark as sent
    const { error: updateError } = await supabase
        .from('terminal_command_queue')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
        })
        .eq('id', data.id);

    if (updateError) {
        logger.error(`[CommandQueue] Failed to mark command as sent:`, updateError);
    }

    return data as QueuedCommand;
}

/**
 * Mark a command as successfully completed.
 */
export async function markCommandSuccess(
    commandId: number,
    terminalSn: string
): Promise<void> {
    const supabase = getSupabase();

    const { error } = await supabase
        .from('terminal_command_queue')
        .update({
            status: 'success',
            completed_at: new Date().toISOString(),
        })
        .eq('command_id', commandId)
        .eq('terminal_sn', terminalSn)
        .eq('status', 'sent');

    if (error) {
        logger.error(`[CommandQueue] Failed to mark success for cmd ${commandId}:`, error);
    }
}

/**
 * Mark a command as failed. Retries if under max_retries; otherwise marks as permanently failed.
 */
export async function markCommandFailed(
    commandId: number,
    terminalSn: string,
    responseCode: number,
    errorMessage: string
): Promise<void> {
    const supabase = getSupabase();

    // Get current retry count
    const { data: cmd } = await supabase
        .from('terminal_command_queue')
        .select('retry_count, max_retries')
        .eq('command_id', commandId)
        .eq('terminal_sn', terminalSn)
        .maybeSingle();

    const retryCount = (cmd?.retry_count || 0) + 1;
    const maxRetries = cmd?.max_retries || 3;
    const shouldRetry = retryCount < maxRetries;

    const { error } = await supabase
        .from('terminal_command_queue')
        .update({
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: retryCount,
            response_code: responseCode,
            error_message: errorMessage,
            completed_at: shouldRetry ? null : new Date().toISOString(),
        })
        .eq('command_id', commandId)
        .eq('terminal_sn', terminalSn);

    if (error) {
        logger.error(`[CommandQueue] Failed to mark failure for cmd ${commandId}:`, error);
    }

    if (shouldRetry) {
        logger.info(`[CommandQueue] Command ${commandId} will retry (${retryCount}/${maxRetries})`);
    } else {
        logger.warn(`[CommandQueue] Command ${commandId} permanently failed after ${retryCount} retries`);
    }
}

/**
 * Get queue summary for a terminal (for diagnostics).
 */
export async function getQueueSummary(terminalSn: string): Promise<{
    pending: number;
    sent: number;
    commands: Array<{ command_id: number; command_type: string; description: string | null; status: string }>;
}> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('terminal_command_queue')
        .select('command_id, command_type, description, status')
        .eq('terminal_sn', terminalSn)
        .in('status', ['pending', 'sent'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

    if (error) {
        logger.error(`[CommandQueue] Failed to get queue summary:`, error);
        return { pending: 0, sent: 0, commands: [] };
    }

    const commands = data || [];
    return {
        pending: commands.filter(c => c.status === 'pending').length,
        sent: commands.filter(c => c.status === 'sent').length,
        commands,
    };
}

/**
 * Clear all pending commands for a terminal.
 */
export async function clearQueue(terminalSn: string): Promise<number> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('terminal_command_queue')
        .delete()
        .eq('terminal_sn', terminalSn)
        .eq('status', 'pending')
        .select('id');

    if (error) {
        logger.error(`[CommandQueue] Failed to clear queue for ${terminalSn}:`, error);
        return 0;
    }

    const count = data?.length || 0;
    logger.info(`[CommandQueue] Cleared ${count} pending commands for ${terminalSn}`);
    return count;
}

/**
 * Look up command description by command ID (replaces cmdTracker lookup).
 */
export async function getCommandDescription(
    commandId: number,
    terminalSn: string
): Promise<string | null> {
    const supabase = getSupabase();

    const { data } = await supabase
        .from('terminal_command_queue')
        .select('description, command_type')
        .eq('command_id', commandId)
        .eq('terminal_sn', terminalSn)
        .maybeSingle();

    if (!data) return null;
    return data.description || data.command_type;
}
