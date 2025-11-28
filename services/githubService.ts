
import { GITHUB_CONFIG } from './githubConfig';
import { User, GenericData, DataModel } from '../types';
import { INITIAL_DATA_MODELS } from '../constants';

const BASE_URL = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}`;

function utf8_to_b64(str: string) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str: string) {
    return decodeURIComponent(escape(window.atob(str)));
}

async function githubRequest(endpoint: string, options: RequestInit = {}) {
    // 🔥 Add timestamp to prevent caching (Cache Busting)
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}t=${Date.now()}`;
    
    const headers = {
        'Authorization': `Bearer ${GITHUB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add cache: 'no-store' to force browser to fetch fresh data
    const response = await fetch(url, { 
        ...options, 
        headers,
        cache: 'no-store'
    });
    return response;
}

// --- Validation ---

export const validateRepositoryAccess = async (): Promise<void> => {
    try {
        // Request the repo root to check existence/access
        const response = await githubRequest('');
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`ไม่พบ Repository "${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}" กรุณาสร้าง Repository นี้ใน GitHub ก่อน`);
            } else if (response.status === 401) {
                throw new Error("Token ไม่ถูกต้อง หรือหมดอายุ (Check githubConfig.ts)");
            } else {
                 throw new Error(`GitHub Error: ${response.status} ${response.statusText}`);
            }
        }
    } catch (error: any) {
        throw new Error(error.message);
    }
};

// --- File Operations ---

async function getFileContent(path: string): Promise<{ content: any, sha: string } | null> {
    try {
        const response = await githubRequest(`/contents/${path}?ref=${GITHUB_CONFIG.BRANCH}`);
        
        if (response.status === 404) {
            return null; // File not found is OK
        }

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`GitHub Error ${response.status}: ${errorBody.message}`);
        }
        
        const data = await response.json();
        const contentStr = b64_to_utf8(data.content.replace(/\n/g, ''));
        return {
            content: JSON.parse(contentStr),
            sha: data.sha
        };
    } catch (error: any) {
        if (error.message.includes('GitHub Error')) throw error;
        console.warn(`Warning reading ${path}:`, error);
        return null;
    }
}

async function saveFileContent(path: string, content: any, message: string, sha?: string) {
    const body: any = {
        message: message,
        content: utf8_to_b64(JSON.stringify(content, null, 2)),
        branch: GITHUB_CONFIG.BRANCH
    };
    if (sha) {
        body.sha = sha;
    }

    const response = await githubRequest(`/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 404) {
             throw new Error(`ไม่พบ Repository หรือ Path ผิดพลาด (${GITHUB_CONFIG.REPO})`);
        }
        throw new Error(`Failed to save: ${err.message || response.statusText}`);
    }
    return await response.json();
}

async function deleteFile(path: string, message: string, sha: string) {
    const response = await githubRequest(`/contents/${path}`, {
        method: 'DELETE',
        body: JSON.stringify({
            message: message,
            sha: sha,
            branch: GITHUB_CONFIG.BRANCH
        })
    });
    
    if (!response.ok && response.status !== 404) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete (${response.status}): ${err.message || response.statusText}`);
    }
}

// --- FOLDER-BASED TOMBSTONES (CONFLICT-FREE DELETION) ---
const DELETED_DIR = 'deleted_log';

async function createDeletionTombstone(id: string) {
    const path = `${DELETED_DIR}/${id}`;
    const existing = await getFileContent(path);
    await saveFileContent(
        path, 
        { deletedAt: new Date().toISOString(), id: id }, 
        `Mark deleted: ${id}`, 
        existing?.sha
    );
}

async function getDeletedTombstones(): Promise<Set<string>> {
    try {
        const response = await githubRequest(`/contents/${DELETED_DIR}?ref=${GITHUB_CONFIG.BRANCH}`);
        if (response.status === 404) return new Set();
        if (!response.ok) return new Set();
        const files = await response.json();
        if (!Array.isArray(files)) return new Set();
        return new Set(files.map((f: any) => f.name));
    } catch (e) {
        return new Set();
    }
}


// --- USERS Service ---

const USERS_PATH = 'users.json';

export const fetchGitHubUsers = async (): Promise<User[]> => {
    const file = await getFileContent(USERS_PATH);
    if (!file) return [];
    return file.content;
};

export const registerGitHubUser = async (newUser: any): Promise<void> => {
    const file = await getFileContent(USERS_PATH);
    const users: User[] = file ? file.content : [];
    
    if (users.some(u => u.username === newUser.username)) {
        throw new Error("Username นี้ถูกใช้งานแล้ว");
    }

    const isFirstUser = users.length === 0;
    const initialRole = isFirstUser ? 'admin' : 'pending';

    const userEntry: User = {
        id: `user_${Date.now()}`,
        username: newUser.username,
        passwordHash: newUser.password, 
        roleId: initialRole,
        displayName: newUser.displayName,
        phoneNumber: newUser.phoneNumber
    };

    users.push(userEntry);
    await saveFileContent(USERS_PATH, users, isFirstUser ? 'Init Admin' : 'Register User', file?.sha);
};

export const updateGitHubUserRole = async (username: string, newRole: string): Promise<void> => {
    const file = await getFileContent(USERS_PATH);
    if (!file) throw new Error("Database error");
    const users: User[] = file.content;
    const index = users.findIndex(u => u.username === username);
    if (index === -1) throw new Error("User not found");
    users[index].roleId = newRole;
    await saveFileContent(USERS_PATH, users, `Update role ${username}`, file.sha);
};

export const updateGitHubUserDetails = async (username: string, details: Partial<User>): Promise<void> => {
    const file = await getFileContent(USERS_PATH);
    if (!file) throw new Error("Database error");
    const users: User[] = file.content;
    const index = users.findIndex(u => u.username === username);
    if (index === -1) throw new Error("User not found");
    
    if (details.displayName) users[index].displayName = details.displayName;
    if (details.phoneNumber) users[index].phoneNumber = details.phoneNumber;
    if (details.passwordHash) users[index].passwordHash = details.passwordHash;

    await saveFileContent(USERS_PATH, users, `Update details ${username}`, file.sha);
};

export const deleteGitHubUser = async (username: string): Promise<void> => {
    const file = await getFileContent(USERS_PATH);
    if (!file) throw new Error("Database error");
    const users: User[] = file.content;
    const newUsers = users.filter(u => u.username !== username);
    await saveFileContent(USERS_PATH, newUsers, `Delete user ${username}`, file.sha);
};

// --- DATA MODELS (SCHEMA) ---
const MODELS_PATH = 'system/datamodels.json';

export const fetchDataModels = async (): Promise<DataModel[]> => {
    const file = await getFileContent(MODELS_PATH);
    if (!file) return INITIAL_DATA_MODELS; // Default fallback
    return file.content;
}

export const saveDataModels = async (models: DataModel[]): Promise<void> => {
    const existing = await getFileContent(MODELS_PATH);
    await saveFileContent(MODELS_PATH, models, 'Update data models', existing?.sha);
}

// --- PATIENTS Service ---

const PATIENTS_DIR = 'patients';

export const fetchGitHubPatients = async (): Promise<GenericData[]> => {
    const deletedSet = await getDeletedTombstones();
    const response = await githubRequest(`/contents/${PATIENTS_DIR}?ref=${GITHUB_CONFIG.BRANCH}`);
    if (response.status === 404) return [];
    
    const files = await response.json();
    if (!Array.isArray(files)) return [];

    const validFiles = files.filter((f: any) => {
        const id = f.name.replace('.json', '');
        return f.name.endsWith('.json') && !deletedSet.has(id);
    });

    const promises = validFiles.map(async (f: any) => {
         try {
            const fileData = await getFileContent(`${PATIENTS_DIR}/${f.name}`);
            return fileData ? fileData.content : null;
         } catch (e) {
            return null;
         }
    });

    const results = await Promise.all(promises);
    
    return results.filter((item): item is GenericData => {
        if (!item) return false;
        if (typeof item !== 'object') return false;
        if (typeof item.id !== 'string') return false;
        if (deletedSet.has(item.id)) return false;
        if (!item.values || Object.keys(item.values).length === 0) return false;
        return true;
    });
};

export const saveGitHubPatient = async (item: GenericData): Promise<void> => {
    const fileName = `${PATIENTS_DIR}/${item.id}.json`;
    const existingFile = await getFileContent(fileName);
    await saveFileContent(fileName, item, `Save patient ${item.id}`, existingFile?.sha);
};

export const deleteGitHubPatient = async (id: string): Promise<void> => {
    await createDeletionTombstone(id);
    const fileName = `${PATIENTS_DIR}/${id}.json`;
    const existingFile = await getFileContent(fileName);
    if (existingFile) {
        await deleteFile(fileName, `Delete patient ${id}`, existingFile.sha);
    }
};
