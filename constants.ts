
import { Role, Permission, User, RolePermissions, DataModel, SchemaFieldType, ThemeSettings, NavigationItem } from './types';
import { v4 as uuidv4 } from 'uuid';

export const INITIAL_ROLES: Role[] = [
    { id: 'admin', name: 'ADMIN', isSystem: true },
    { id: 'level1', name: 'LEVEL_1' },
    { id: 'level2', name: 'LEVEL_2' },
];

// Empty initial users - will be fetched from Google Sheet
export const INITIAL_USERS: User[] = [];

export const INITIAL_ROLE_PERMISSIONS: RolePermissions = {
    'admin': [
        Permission.VIEW_PATIENTS,
        Permission.CREATE_PATIENT,
        Permission.EDIT_PATIENT,
        Permission.DELETE_PATIENT,
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_APP_BUILDER,
    ],
    'level1': [
        Permission.VIEW_PATIENTS,
        Permission.CREATE_PATIENT,
        Permission.EDIT_PATIENT,
    ],
    'level2': [
        Permission.VIEW_PATIENTS,
    ],
};

const patientNameFieldId = uuidv4();
const patientHnFieldId = uuidv4();
export const INITIAL_DATA_MODELS: DataModel[] = [
    {
        id: 'patients',
        name: 'ข้อมูลคนไข้',
        nameFieldId: patientNameFieldId,
        schema: [
            { id: patientNameFieldId, label: 'ชื่อ-สกุล', type: SchemaFieldType.TEXT, required: true, isSystem: true },
            { id: patientHnFieldId, label: 'HN', type: SchemaFieldType.TEXT, required: true, isSystem: true },
            { id: uuidv4(), label: 'ที่อยู่', type: SchemaFieldType.TEXTAREA, required: false },
            { id: 'age', label: 'อายุ', type: SchemaFieldType.NUMBER, required: false },
            { id: 'disease', label: 'โรคประจำตัว', type: SchemaFieldType.TEXTAREA, required: false },
            { id: uuidv4(), label: 'อาการสำคัญ', type: SchemaFieldType.TEXTAREA, required: false },
            { id: uuidv4(), label: 'ประวัติการเจ็บป่วย', type: SchemaFieldType.TEXTAREA, required: false },
            { id: uuidv4(), label: 'การประเมิน', type: SchemaFieldType.TEXTAREA, required: false },
            { id: uuidv4(), label: 'การวินิจฉัย', type: SchemaFieldType.TEXTAREA, required: false },
            { id: uuidv4(), label: 'วันที่เยี่ยมบ้าน', type: SchemaFieldType.DATE, required: false },
        ]
    }
];

export const INITIAL_THEME_SETTINGS: ThemeSettings = {
    primary: '#0e7490',       // teal-800
    primaryAccent: '#0d9488', // teal-600
    background: '#ffffff',    // white
    textBase: '#111827',      // gray-900
    textMuted: '#4b5563',     // gray-600
    sidebarBg: '#115e59',      // teal-900
    sidebarText: '#ffffff',   // white
    border: '#000000',        // black
    fontSize: 16,
};

export const INITIAL_NAVIGATION: NavigationItem[] = [
    { id: uuidv4(), label: 'แดชบอร์ด', icon: 'BarChartIcon', target: 'dashboard', permission: Permission.VIEW_PATIENTS },
    { id: uuidv4(), label: 'ข้อมูลคนไข้', icon: 'HomeIcon', target: 'patients', permission: Permission.VIEW_PATIENTS },
    { id: uuidv4(), label: 'จัดการผู้ใช้งาน', icon: 'UsersIcon', target: 'user-management', permission: Permission.MANAGE_USERS },
    { id: uuidv4(), label: 'App Builder', icon: 'SettingsIcon', target: 'app-builder', permission: Permission.MANAGE_APP_BUILDER },
];
