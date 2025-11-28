
import { User, GenericData, SchemaField } from '../types';
import { 
    fetchGitHubUsers, 
    registerGitHubUser, 
    updateGitHubUserRole, 
    updateGitHubUserDetails,
    deleteGitHubUser,
    fetchGitHubPatients,
    saveGitHubPatient,
    deleteGitHubPatient,
    validateRepositoryAccess
} from './githubService';

// --- System Check ---
export const getSystemStatus = async (): Promise<{ isConnected: boolean, userCount: number, error?: string }> => {
    try {
        // 1. ตรวจสอบว่า Repo มีอยู่จริงและเข้าถึงได้ไหม
        await validateRepositoryAccess();

        // 2. ถ้า Repo OK, ลองดึง Users
        const users = await fetchGitHubUsers();
        return { isConnected: true, userCount: users.length };
    } catch (e: any) {
        return { isConnected: false, userCount: 0, error: e.message };
    }
};

// --- Users ---

export const authenticateUser = async (username: string, password: string): Promise<User> => {
    const users = await fetchGitHubUsers();
    const user = users.find(u => u.username === username && u.passwordHash === password);
    
    if (!user) {
        throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
    
    if (user.roleId === 'pending') {
        throw new Error("บัญชีของคุณรอการอนุมัติจาก Admin");
    }

    return user;
};

export const registerUser = async (userData: any): Promise<void> => {
    try {
        await registerGitHubUser(userData);
    } catch (error: any) {
        throw new Error(error.message || "การสมัครสมาชิกบน GitHub ล้มเหลว");
    }
};

export const fetchUserListSafe = async (): Promise<User[]> => {
    return await fetchGitHubUsers();
};

export const updateUserRole = async (username: string, newRole: string): Promise<void> => {
    await updateGitHubUserRole(username, newRole);
};

export const updateUserDetails = async (username: string, details: Partial<User>): Promise<void> => {
    await updateGitHubUserDetails(username, details);
};

export const deleteUser = async (username: string): Promise<void> => {
    await deleteGitHubUser(username);
};

// --- Patients / Data ---

export const fetchPatientData = async (): Promise<GenericData[]> => {
    return await fetchGitHubPatients();
};

export const savePatientData = async (item: GenericData, schema: SchemaField[]): Promise<void> => {
    await saveGitHubPatient(item);
};

export const deletePatientData = async (itemId: string): Promise<void> => {
    await deleteGitHubPatient(itemId);
};

export const testConnection = async (): Promise<boolean> => {
    try {
        await validateRepositoryAccess();
        return true;
    } catch (e) {
        return false;
    }
}
