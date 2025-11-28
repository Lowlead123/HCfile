
import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { User, Role, Permission, RolePermissions, DataModel, GenericData, ThemeSettings, NavigationItem, DashboardWidget, PageThemeOverride, CustomPage, ToastMessage, ToastType } from '../types';
import { INITIAL_ROLE_PERMISSIONS, INITIAL_THEME_SETTINGS, INITIAL_NAVIGATION, INITIAL_ROLES, INITIAL_DATA_MODELS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { fetchUserListSafe, authenticateUser, fetchPatientData, savePatientData, deletePatientData } from '../services/sheetService';
import { fetchDataModels, saveDataModels as saveGitHubDataModels } from '../services/githubService';

interface AppState {
    currentUser: User | null;
    users: User[]; 
    roles: Role[];
    rolePermissions: RolePermissions;
    dataModels: DataModel[];
    data: { [modelId: string]: GenericData[] };
    customPages: CustomPage[];
    theme: ThemeSettings;
    navigation: NavigationItem[];
    dashboardWidgets: DashboardWidget[];
    patientListVisibleColumns: string[];
    pageThemeOverrides: PageThemeOverride[];
    isUsersLoading: boolean;
    userFetchError: string | null;
    isDataLoading: boolean;
    dataFetchError: string | null;
    // UI State
    toasts: ToastMessage[];
}

type Action =
    | { type: 'LOGIN'; payload: User }
    | { type: 'LOGOUT' }
    | { type: 'SET_USERS'; payload: User[] }
    | { type: 'SET_ROLES'; payload: Role[] }
    | { type: 'SET_ROLE_PERMISSIONS'; payload: RolePermissions }
    | { type: 'SET_THEME'; payload: ThemeSettings }
    | { type: 'SET_NAVIGATION'; payload: NavigationItem[] }
    | { type: 'SET_DASHBOARD_WIDGETS'; payload: DashboardWidget[] }
    | { type: 'SET_PAGE_THEME_OVERRIDES'; payload: PageThemeOverride[] }
    | { type: 'SET_DATA_MODELS'; payload: DataModel[] }
    | { type: 'SET_CUSTOM_PAGES'; payload: CustomPage[] }
    | { type: 'SET_DATA'; payload: { modelId: string; data: GenericData[] } }
    | { type: 'SET_PATIENT_LIST_COLUMNS'; payload: string[] }
    | { type: 'SET_USERS_LOADING'; payload: boolean }
    | { type: 'SET_USERS_ERROR'; payload: string | null }
    | { type: 'SET_DATA_LOADING'; payload: boolean }
    | { type: 'SET_DATA_ERROR'; payload: string | null }
    | { type: 'ADD_TOAST'; payload: ToastMessage }
    | { type: 'REMOVE_TOAST'; payload: string };


const initialState: AppState = {
    currentUser: null,
    users: [],
    roles: INITIAL_ROLES,
    rolePermissions: INITIAL_ROLE_PERMISSIONS,
    dataModels: INITIAL_DATA_MODELS,
    data: { 'patients': [] },
    customPages: [],
    theme: INITIAL_THEME_SETTINGS,
    navigation: INITIAL_NAVIGATION,
    dashboardWidgets: [],
    patientListVisibleColumns: [],
    pageThemeOverrides: [],
    isUsersLoading: false,
    userFetchError: null,
    isDataLoading: false,
    dataFetchError: null,
    toasts: [],
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'LOGIN': return { ...state, currentUser: action.payload };
        case 'LOGOUT': return { ...state, currentUser: null, users: [], data: { 'patients': [] } };
        case 'SET_USERS': return { ...state, users: action.payload };
        case 'SET_ROLES': return { ...state, roles: action.payload };
        case 'SET_ROLE_PERMISSIONS': return { ...state, rolePermissions: action.payload };
        case 'SET_THEME': return { ...state, theme: action.payload };
        case 'SET_NAVIGATION': return { ...state, navigation: action.payload };
        case 'SET_DASHBOARD_WIDGETS': return { ...state, dashboardWidgets: action.payload };
        case 'SET_PAGE_THEME_OVERRIDES': return { ...state, pageThemeOverrides: action.payload };
        case 'SET_DATA_MODELS': return { ...state, dataModels: action.payload };
        case 'SET_CUSTOM_PAGES': return { ...state, customPages: action.payload };
        case 'SET_DATA': return { ...state, data: { ...state.data, [action.payload.modelId]: action.payload.data } };
        case 'SET_PATIENT_LIST_COLUMNS': return { ...state, patientListVisibleColumns: action.payload };
        case 'SET_USERS_LOADING': return { ...state, isUsersLoading: action.payload };
        case 'SET_USERS_ERROR': return { ...state, userFetchError: action.payload };
        case 'SET_DATA_LOADING': return { ...state, isDataLoading: action.payload };
        case 'SET_DATA_ERROR': return { ...state, dataFetchError: action.payload };
        case 'ADD_TOAST': return { ...state, toasts: [...state.toasts, action.payload] };
        case 'REMOVE_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
        default: return state;
    }
};

const TOMBSTONE_KEY = 'hc_local_tombstones';

const getLocalTombstones = (): Set<string> => {
    try {
        const raw = localStorage.getItem(TOMBSTONE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
};

const addLocalTombstone = (id: string) => {
    try {
        const current = getLocalTombstones();
        current.add(id);
        localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {
        console.error("Failed to save local tombstone", e);
    }
};


const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    hasPermission: (permission: Permission) => boolean;
    login: (u: string, p: string) => Promise<void>;
    refreshUserList: () => Promise<void>;
    refreshPatientData: () => Promise<void>;
    savePatient: (item: GenericData) => Promise<void>;
    deletePatient: (id: string) => Promise<void>;
    updateDataModels: (models: DataModel[]) => Promise<void>;
    showToast: (message: string, type?: ToastType) => void;
}>({
    state: initialState,
    dispatch: () => null,
    hasPermission: () => false,
    login: async () => {},
    refreshUserList: async () => {},
    refreshPatientData: async () => {},
    savePatient: async () => {},
    deletePatient: async () => {},
    updateDataModels: async () => {},
    showToast: () => {},
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    
    // Load UI settings
    useEffect(() => {
        const saved = localStorage.getItem('app_ui_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.theme) dispatch({type: 'SET_THEME', payload: parsed.theme});
                if (parsed.patientListVisibleColumns) dispatch({type: 'SET_PATIENT_LIST_COLUMNS', payload: parsed.patientListVisibleColumns});
            } catch(e) {}
        }
    }, []);

    // Load Data Models from GitHub on start
    useEffect(() => {
        const loadModels = async () => {
            try {
                const models = await fetchDataModels();
                dispatch({ type: 'SET_DATA_MODELS', payload: models });
            } catch (error) {
                console.warn("Could not load data models, using default", error);
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        const uiSettings = {
            theme: state.theme,
            patientListVisibleColumns: state.patientListVisibleColumns
        };
        localStorage.setItem('app_ui_settings', JSON.stringify(uiSettings));
    }, [state.theme, state.patientListVisibleColumns]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = uuidv4();
        dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    };

    const login = async (username: string, password: string) => {
        dispatch({ type: 'SET_USERS_LOADING', payload: true });
        dispatch({ type: 'SET_USERS_ERROR', payload: null });
        try {
            const user = await authenticateUser(username, password);
            dispatch({ type: 'LOGIN', payload: user });
            showToast(`ยินดีต้อนรับ ${user.displayName || user.username}`, 'success');
            
            refreshPatientData();
            if (user.roleId === 'admin') {
                refreshUserList();
            }
        } catch (error: any) {
            const msg = error.message || 'Login failed';
            dispatch({ type: 'SET_USERS_ERROR', payload: msg });
            showToast(msg, 'error');
            throw error;
        } finally {
            dispatch({ type: 'SET_USERS_LOADING', payload: false });
        }
    };

    const refreshUserList = async () => {
        try {
            const users = await fetchUserListSafe();
            dispatch({ type: 'SET_USERS', payload: users });
        } catch (error) {
            console.error("Failed to refresh user list", error);
        }
    };

    const refreshPatientData = async () => {
        dispatch({ type: 'SET_DATA_LOADING', payload: true });
        dispatch({ type: 'SET_DATA_ERROR', payload: null });
        try {
            const rawData = await fetchPatientData();
            
            const localTombstones = getLocalTombstones();
            const cleanData = rawData.filter(item => !localTombstones.has(item.id));

            dispatch({ type: 'SET_DATA', payload: { modelId: 'patients', data: cleanData } });
        } catch (error: any) {
            console.error("Failed to load patients", error);
            dispatch({ type: 'SET_DATA_ERROR', payload: error.message || 'Error loading data' });
            showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
        } finally {
            dispatch({ type: 'SET_DATA_LOADING', payload: false });
        }
    };

    const savePatient = async (item: GenericData) => {
        dispatch({ type: 'SET_DATA_LOADING', payload: true });
        try {
            const model = state.dataModels.find(m => m.id === item.modelId);
            const schema = model ? model.schema : [];
            
            await savePatientData(item, schema);
            await refreshPatientData();
            showToast('บันทึกข้อมูลเรียบร้อย', 'success');
        } catch (error: any) {
            showToast(error.message || 'บันทึกไม่สำเร็จ', 'error');
            throw error;
        } finally {
            dispatch({ type: 'SET_DATA_LOADING', payload: false });
        }
    };

    const deletePatient = async (id: string) => {
        addLocalTombstone(id);
        
        const previousData = state.data['patients'] || [];
        const optimisticData = previousData.filter(p => p.id !== id);
        
        dispatch({ 
            type: 'SET_DATA', 
            payload: { modelId: 'patients', data: optimisticData } 
        });

        try {
            await deletePatientData(id);
            setTimeout(() => refreshPatientData(), 1000);
            showToast('ลบข้อมูลเรียบร้อย', 'success');

        } catch (error: any) {
            console.error("Deletion failed on server:", error);
            showToast('การลบข้อมูลบน Server มีปัญหา แต่เราซ่อนข้อมูลไว้แล้ว', 'info');
        }
    };

    const updateDataModels = async (models: DataModel[]) => {
        dispatch({ type: 'SET_DATA_MODELS', payload: models });
        try {
            await saveGitHubDataModels(models);
            showToast('บันทึกโครงสร้างข้อมูลเรียบร้อย', 'success');
        } catch (error: any) {
            showToast('บันทึกโครงสร้างไม่สำเร็จ: ' + error.message, 'error');
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        if (!state.currentUser) return false;
        
        // 🚀 GOD MODE: Admin always has permission, regardless of table settings
        // This ensures the admin checkbox UI is just visual, not functional blocking
        if (state.currentUser.roleId === 'admin') return true;

        const userRoleId = state.currentUser.roleId;
        return state.rolePermissions[userRoleId]?.includes(permission) ?? false;
    };

    return (
        <AppContext.Provider value={{ state, dispatch, hasPermission, login, refreshUserList, refreshPatientData, savePatient, deletePatient, updateDataModels, showToast }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
