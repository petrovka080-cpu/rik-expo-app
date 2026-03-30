// FILE: lib/activityLogger.ts
// Utility for logging team actions to activity_logs table

import { supabase } from '../src/lib/supabaseClient';

export type ActionType =
    | 'approve'
    | 'reject'
    | 'create'
    | 'update'
    | 'delete'
    | 'receive'
    | 'ship'
    | 'process'
    | 'complete'
    | 'cancel'
    | 'view';

export type ActionCategory =
    | 'request'
    | 'invoice'
    | 'delivery'
    | 'payment'
    | 'inventory'
    | 'report'
    | 'object'
    | 'document'
    | 'material'
    | 'work';

export type EntityType =
    | 'request'
    | 'invoice'
    | 'delivery'
    | 'payment'
    | 'material'
    | 'object'
    | 'report'
    | 'work_report'
    | 'journal_entry'
    | 'quality_check'
    | 'safety_record'
    | 'problem_report'
    | 'personnel_log'
    | 'equipment_log'
    | 'signature';

export interface LogActivityParams {
    companyId: string;
    userId: string;
    userName: string;
    userRole: string;
    actionType: ActionType;
    actionCategory: ActionCategory;
    entityType: EntityType;
    entityId?: string;
    entityName?: string;
    description?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    metadata?: Record<string, any>;
    relatedObjectId?: string;
    relatedRequestId?: string;
}

/**
 * Log an activity to the activity_logs table
 */
export async function logActivity(params: LogActivityParams): Promise<string | null> {
    try {
        const { data, error } = await supabase.rpc('log_activity', {
            p_company_id: params.companyId,
            p_user_id: params.userId,
            p_user_name: params.userName,
            p_user_role: params.userRole,
            p_action_type: params.actionType,
            p_action_category: params.actionCategory,
            p_entity_type: params.entityType,
            p_entity_id: params.entityId || null,
            p_entity_name: params.entityName || null,
            p_description: params.description || null,
            p_old_value: params.oldValue || null,
            p_new_value: params.newValue || null,
            p_metadata: params.metadata || null,
            p_related_object_id: params.relatedObjectId || null,
            p_related_request_id: params.relatedRequestId || null,
        });

        if (error) {
            console.error('[ActivityLogger] Error logging activity:', error);
            return null;
        }

        return data as string;
    } catch (e) {
        console.error('[ActivityLogger] Exception:', e);
        return null;
    }
}

/**
 * Get activity logs with optional filters
 */
export interface GetActivityLogsParams {
    companyId: string;
    userRole?: string;
    actionType?: ActionType;
    actionCategory?: ActionCategory;
    entityType?: EntityType;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

export interface ActivityLogEntry {
    id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    action_type: string;
    action_category: string;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    description: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
}

export async function getActivityLogs(params: GetActivityLogsParams): Promise<ActivityLogEntry[]> {
    try {
        const { data, error } = await supabase.rpc('get_activity_logs', {
            p_company_id: params.companyId,
            p_user_role: params.userRole || null,
            p_action_type: params.actionType || null,
            p_action_category: params.actionCategory || null,
            p_entity_type: params.entityType || null,
            p_date_from: params.dateFrom || null,
            p_date_to: params.dateTo || null,
            p_limit: params.limit || 50,
            p_offset: params.offset || 0,
        });

        if (error) {
            console.error('[ActivityLogger] Error getting logs:', error);
            return [];
        }

        return (data || []) as ActivityLogEntry[];
    } catch (e) {
        console.error('[ActivityLogger] Exception:', e);
        return [];
    }
}

/**
 * Quick helper functions for common actions
 */

// Director actions
export const logDirectorApproval = (
    companyId: string,
    userId: string,
    userName: string,
    entityType: EntityType,
    entityId: string,
    entityName: string,
    approved: boolean
) => logActivity({
    companyId,
    userId,
    userName,
    userRole: 'director',
    actionType: approved ? 'approve' : 'reject',
    actionCategory: 'request',
    entityType,
    entityId,
    entityName,
    description: approved
        ? `Директор ${userName} утвердил ${entityName}`
        : `Директор ${userName} отклонил ${entityName}`,
});

// Accountant actions
export const logAccountantAction = (
    companyId: string,
    userId: string,
    userName: string,
    actionType: ActionType,
    entityType: EntityType,
    entityId: string,
    entityName: string,
    description?: string
) => logActivity({
    companyId,
    userId,
    userName,
    userRole: 'accountant',
    actionType,
    actionCategory: 'invoice',
    entityType,
    entityId,
    entityName,
    description: description || `Бухгалтер ${userName} ${getActionDescription(actionType)} ${entityName}`,
});

// Warehouse actions
export const logWarehouseAction = (
    companyId: string,
    userId: string,
    userName: string,
    actionType: ActionType,
    entityType: EntityType,
    entityId: string,
    entityName: string,
    metadata?: Record<string, any>
) => logActivity({
    companyId,
    userId,
    userName,
    userRole: 'warehouse',
    actionType,
    actionCategory: 'inventory',
    entityType,
    entityId,
    entityName,
    description: `Складовщик ${userName} ${getActionDescription(actionType)} ${entityName}`,
    metadata,
});

// Worker/Foreman actions for construction reports
export const logConstructionAction = (
    companyId: string,
    userId: string,
    userName: string,
    userRole: string,
    actionType: ActionType,
    entityType: EntityType,
    entityId: string,
    entityName: string,
    relatedObjectId?: string
) => logActivity({
    companyId,
    userId,
    userName,
    userRole,
    actionType,
    actionCategory: 'report',
    entityType,
    entityId,
    entityName,
    description: `${getRoleName(userRole)} ${userName} ${getActionDescription(actionType)} ${entityName}`,
    relatedObjectId,
});

// Helper functions
function getActionDescription(actionType: ActionType): string {
    const descriptions: Record<ActionType, string> = {
        approve: 'утвердил',
        reject: 'отклонил',
        create: 'создал',
        update: 'обновил',
        delete: 'удалил',
        receive: 'принял',
        ship: 'отгрузил',
        process: 'обработал',
        complete: 'завершил',
        cancel: 'отменил',
        view: 'просмотрел',
    };
    return descriptions[actionType] || actionType;
}

function getRoleName(role: string): string {
    const roles: Record<string, string> = {
        director: 'Директор',
        accountant: 'Бухгалтер',
        warehouse: 'Складовщик',
        worker: 'Сотрудник',
        foreman: 'Прораб',
        engineer: 'Инженер',
        manager: 'Менеджер',
        supplier: 'Поставщик',
    };
    return roles[role] || role;
}
