
export interface Role {
    id: string;
    name: string;
    isSystem?: boolean;
}

export enum Permission {
    VIEW_PATIENTS = 'VIEW_PATIENTS',
    CREATE_PATIENT = 'CREATE_PATIENT',
    EDIT_PATIENT = 'EDIT_PATIENT',
    DELETE_PATIENT = 'DELETE_PATIENT',
    MANAGE_USERS = 'MANAGE_USERS',
    MANAGE_ROLES = 'MANAGE_ROLES',
    MANAGE_APP_BUILDER = 'MANAGE_APP_BUILDER',
}

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    roleId: string;
    displayName?: string;
    phoneNumber?: string; // Added phone number
}

export type RolePermissions = {
    [roleId: string]: Permission[];
};

export enum SchemaFieldType {
    TEXT = 'TEXT',
    TEXTAREA = 'TEXTAREA',
    NUMBER = 'NUMBER',
    DATE = 'DATE',
    GPS = 'GPS',
}

export interface SchemaField {
    id: string;
    label: string;
    type: SchemaFieldType;
    required: boolean;
    isSystem?: boolean;
}

export interface DataModel {
    id: string;
    name: string; // e.g., "Patients", "Appointments"
    nameFieldId: string; // ID of the field to be used as the primary display name
    schema: SchemaField[];
}

export interface GenericData {
    id: string;
    modelId: string;
    createdAt: string;
    updatedAt: string;
    // Dynamic data based on schema fields
    values: { [fieldId: string]: any };
}


export interface ThemeSettings {
    primary: string;
    primaryAccent: string;
    background: string;
    textBase: string;
    textMuted: string;
    sidebarBg: string;
    sidebarText: string;
    border: string;
    fontSize: number;
}

export type ViewType = 'patients' | 'user-management' | 'dashboard' | 'app-builder';
export type TargetType = ViewType | `custom-page-${string}`;


export interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    target: TargetType;
    permission: Permission;
}

export interface PageThemeOverride {
    id: string;
    view: ViewType;
    settings: Partial<ThemeSettings>;
}

export interface CustomPage {
    id: string;
    title: string;
    content: string; // Simple content for now, could be extended to support more complex layouts
}


// Dashboard Types
export type ChartType = 'KPI' | 'BAR' | 'PIE';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte';

export interface Filter {
    id: string;
    fieldId: string;
    operator: FilterOperator;
    value: any;
}

export interface DashboardWidget {
    id: string;
    title: string;
    modelId: string;
    chartType: ChartType;
    filters: Filter[];
    groupByFieldId?: string; // Used for BAR and PIE charts
}
