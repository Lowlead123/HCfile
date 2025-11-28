
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
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${GITHUB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
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
            return null; // File not found is OK (empty DB)
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
        // Re-throw critical errors (like Auth fail) so UI knows
        if (error.message.includes('GitHub Error')) throw error;
        console.error(`Error reading ${path}:`, error);
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
    if (!response.ok) throw new Error("Failed to delete file on GitHub");
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
    
    // Check duplicates
    if (users.some(u => u.username === newUser.username)) {
        throw new Error("Username นี้ถูกใช้งานแล้ว");
    }

    // 👑 Logic: ถ้าเป็นคนแรกของระบบ ให้เป็น Admin ทันที
    const isFirstUser = users.length === 0;
    const initialRole = isFirstUser ? 'admin' : 'pending';

    // Add new user
    const userEntry: User = {
        id: `user_${Date.now()}`,
        username: newUser.username,
        passwordHash: newUser.password, 
        roleId: initialRole,
        displayName: newUser.displayName,
        phoneNumber: newUser.phoneNumber
    };

    users.push(userEntry);

    const commitMsg = isFirstUser 
        ? `Init system: First admin ${newUser.username}` 
        : `Register user ${newUser.username}`;

    await saveFileContent(USERS_PATH, users, commitMsg, file?.sha);
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
    const response = await githubRequest(`/contents/${PATIENTS_DIR}?ref=${GITHUB_CONFIG.BRANCH}`);
    if (response.status === 404) return [];
    
    const files = await response.json();
    if (!Array.isArray(files)) return [];

    const promises = files
        .filter((f: any) => f.name.endsWith('.json'))
        .map(async (f: any) => {
             const fileData = await getFileContent(`${PATIENTS_DIR}/${f.name}`);
             return fileData ? fileData.content : null;
        });

    const results = await Promise.all(promises);
    return results.filter(item => item !== null);
};

export const saveGitHubPatient = async (item: GenericData): Promise<void> => {
    const fileName = `${PATIENTS_DIR}/${item.id}.json`;
    const existingFile = await getFileContent(fileName);
    await saveFileContent(fileName, item, `Save patient ${item.id}`, existingFile?.sha);
};

export const deleteGitHubPatient = async (id: string): Promise<void> => {
    const fileName = `${PATIENTS_DIR}/${id}.json`;
    const existingFile = await getFileContent(fileName);
    if (existingFile) {
        await deleteFile(fileName, `Delete patient ${id}`, existingFile.sha);
    }
};
