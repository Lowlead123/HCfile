
import { GITHUB_CONFIG } from './githubConfig';
import { User, GenericData } from '../types';

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
    // Strategy: Create a file named after the ID.
    // This avoids the concurrency issues of updating a single 'deleted_ids.json' file.
    const path = `${DELETED_DIR}/${id}`;
    
    // Check if it already exists to avoid unnecessary writes (though PUT handles updates fine)
    const existing = await getFileContent(path);
    
    await saveFileContent(
        path, 
        { 
            deletedAt: new Date().toISOString(),
            id: id 
        }, 
        `Mark deleted: ${id}`, 
        existing?.sha
    );
}

async function getDeletedTombstones(): Promise<Set<string>> {
    try {
        const response = await githubRequest(`/contents/${DELETED_DIR}?ref=${GITHUB_CONFIG.BRANCH}`);
        if (response.status === 404) return new Set(); // Folder doesn't exist yet, no deletions
        
        if (!response.ok) return new Set();
        
        const files = await response.json();
        if (!Array.isArray(files)) return new Set();
        
        // The file name IS the ID
        return new Set(files.map((f: any) => f.name));
    } catch (e) {
        console.warn("Could not fetch deletion logs", e);
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
    
    // Update fields
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

// --- PATIENTS Service ---

const PATIENTS_DIR = 'patients';

export const fetchGitHubPatients = async (): Promise<GenericData[]> => {
    // 1. Fetch Online Tombstones (The Truth)
    const deletedSet = await getDeletedTombstones();

    // 2. Fetch Files List
    const response = await githubRequest(`/contents/${PATIENTS_DIR}?ref=${GITHUB_CONFIG.BRANCH}`);
    if (response.status === 404) return [];
    
    const files = await response.json();
    if (!Array.isArray(files)) return [];

    // 3. Filter out files that have a tombstone in `deleted_log/`
    const validFiles = files.filter((f: any) => {
        const id = f.name.replace('.json', '');
        return f.name.endsWith('.json') && !deletedSet.has(id);
    });

    // 4. Fetch Content
    const promises = validFiles.map(async (f: any) => {
         try {
            const fileData = await getFileContent(`${PATIENTS_DIR}/${f.name}`);
            return fileData ? fileData.content : null;
         } catch (e) {
            return null;
         }
    });

    const results = await Promise.all(promises);
    
    // 5. Strict Validation (Prevent Empty Frames)
    return results.filter((item): item is GenericData => {
        if (!item) return false;
        if (typeof item !== 'object') return false;
        if (typeof item.id !== 'string') return false;
        
        // Double check against tombstone
        if (deletedSet.has(item.id)) return false;
        
        // Fix for "Empty Frame": Ensure values object exists and has keys
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
    // 1. Create Tombstone FIRST (Online Memory)
    // Creating a file is idempotent and conflict-free unlike editing a list.
    // Once this file exists, fetchGitHubPatients will IGNORE the patient, 
    // even if the actual patient file deletion fails or is slow.
    await createDeletionTombstone(id);

    // 2. Delete the actual file
    const fileName = `${PATIENTS_DIR}/${id}.json`;
    const existingFile = await getFileContent(fileName);
    
    if (existingFile) {
        await deleteFile(fileName, `Delete patient ${id}`, existingFile.sha);
    }
};
