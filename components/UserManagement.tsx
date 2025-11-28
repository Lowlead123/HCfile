
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Role, Permission, User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon, SparklesIcon, UserIcon, LockIcon } from './Icons';
import { updateUserRole, deleteUser, updateUserDetails } from '../services/sheetService';
import { Modal, ConfirmModal } from './UI';

const permissionTranslations: Record<Permission, string> = {
    [Permission.VIEW_PATIENTS]: 'ดูข้อมูลคนไข้',
    [Permission.CREATE_PATIENT]: 'สร้างข้อมูลคนไข้',
    [Permission.EDIT_PATIENT]: 'แก้ไขข้อมูลคนไข้',
    [Permission.DELETE_PATIENT]: 'ลบข้อมูลคนไข้',
    [Permission.MANAGE_USERS]: 'จัดการผู้ใช้งาน',
    [Permission.MANAGE_ROLES]: 'จัดการบทบาท',
    [Permission.MANAGE_APP_BUILDER]: 'เข้าถึง App Builder',
};

// --- Edit User Modal ---
const EditUserModal: React.FC<{ user: User | null, isOpen: boolean, onClose: () => void, onSuccess: () => void }> = ({ user, isOpen, onClose, onSuccess }) => {
    const { showToast } = useAppContext();
    const [formData, setFormData] = useState({ displayName: '', phoneNumber: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                phoneNumber: user.phoneNumber || '',
                password: '' // Keep empty unless changing
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);
        try {
            const updates: Partial<User> = {
                displayName: formData.displayName,
                phoneNumber: formData.phoneNumber
            };
            if (formData.password) {
                updates.passwordHash = formData.password;
            }
            await updateUserDetails(user.username, updates);
            showToast('อัปเดตข้อมูลสำเร็จ', 'success');
            onSuccess();
            onClose();
        } catch (e: any) {
            showToast(`เกิดข้อผิดพลาด: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Modal isOpen={isOpen} title={`แก้ไขข้อมูล: ${user.username}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อแสดงผล (Display Name)</label>
                    <input 
                        type="text" 
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary" 
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                    <input 
                        type="text" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary" 
                        value={formData.phoneNumber}
                        onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)</label>
                    <input 
                        type="password" 
                        placeholder="******"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center"
                    >
                        {isLoading && <SparklesIcon className="w-4 h-4 mr-2 animate-spin"/>}
                        บันทึก
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- Components ---
const RoleManager: React.FC = () => {
    const { state, dispatch, showToast } = useAppContext();
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState('');
    const [confirmDeleteRole, setConfirmDeleteRole] = useState<Role | null>(null);

    const usersPerRole = useMemo(() => {
        return state.users.reduce((acc, user) => {
            acc[user.roleId] = (acc[user.roleId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [state.users]);

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setRoleName(role.name);
    };

    const handleCancel = () => {
        setEditingRole(null);
        setRoleName('');
    };

    const handleSave = () => {
        if (!editingRole || roleName.trim() === '') return;
        const updatedRoles = state.roles.map(r => r.id === editingRole.id ? { ...r, name: roleName.trim() } : r);
        dispatch({ type: 'SET_ROLES', payload: updatedRoles });
        showToast('แก้ไขบทบาทเรียบร้อย', 'success');
        handleCancel();
    };
    
    const handleAddRole = () => {
        const newName = prompt('กรุณาใส่ชื่อบทบาทใหม่:');
        if (newName && newName.trim() !== '') {
            const newRole: Role = { id: uuidv4(), name: newName.trim() };
            dispatch({ type: 'SET_ROLES', payload: [...state.roles, newRole] });
            dispatch({ type: 'SET_ROLE_PERMISSIONS', payload: { ...state.rolePermissions, [newRole.id]: [] } });
            showToast('เพิ่มบทบาทสำเร็จ', 'success');
        }
    };
    
    const handleDeleteRoleConfirm = () => {
        if (!confirmDeleteRole) return;
        const newRoles = state.roles.filter(r => r.id !== confirmDeleteRole.id);
        const newPermissions = { ...state.rolePermissions };
        delete newPermissions[confirmDeleteRole.id];
        dispatch({ type: 'SET_ROLES', payload: newRoles });
        dispatch({ type: 'SET_ROLE_PERMISSIONS', payload: newPermissions });
        showToast('ลบบทบาทเรียบร้อย', 'success');
        setConfirmDeleteRole(null);
    };

    return (
        <>
            <div className="bg-app-background rounded-lg border border-app overflow-hidden mb-8 shadow-sm">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-app-text">จัดการบทบาท (Roles)</h2>
                    <button onClick={handleAddRole} className="flex items-center text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary-dark transition-colors shadow-sm">
                        <PlusIcon className="w-4 h-4 mr-1"/> เพิ่มบทบาท
                    </button>
                </div>
                <div className="divide-y divide-gray-200">
                    {state.roles.map(role => (
                        <div key={role.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            {editingRole?.id === role.id ? (
                                <div className="flex-grow flex items-center gap-2">
                                    <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)} className="p-1 border border-app rounded-md focus:ring-2 focus:ring-primary focus:outline-none" autoFocus />
                                    <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800"><CheckIcon className="w-5 h-5"/></button>
                                    <button onClick={handleCancel} className="p-1 text-red-600 hover:text-red-800"><XIcon className="w-5 h-5"/></button>
                                </div>
                            ) : (
                                <div className="font-medium text-app-text flex items-center gap-2">
                                    {role.name} 
                                    {role.isSystem && <span className="bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide">System</span>}
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                               <span className="text-sm text-app-text-muted mr-2">({usersPerRole[role.id] || 0} users)</span>
                                {!role.isSystem && (
                                    <>
                                    <button onClick={() => handleEdit(role)} className="text-yellow-600 hover:text-yellow-900 p-1.5 hover:bg-yellow-50 rounded"><EditIcon className="w-4 h-4"/></button>
                                    <button onClick={() => setConfirmDeleteRole(role)} className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded" disabled={usersPerRole[role.id] > 0}><TrashIcon className="w-4 h-4"/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!confirmDeleteRole}
                title="ลบบทบาท"
                message={`คุณแน่ใจหรือไม่ว่าต้องการลบบทบาท "${confirmDeleteRole?.name}"?`}
                onCancel={() => setConfirmDeleteRole(null)}
                onConfirm={handleDeleteRoleConfirm}
                isDanger
                confirmText="ลบ"
            />
        </>
    )
}

const PendingUserRow: React.FC<{ 
    user: User, 
    roles: Role[], 
    onApprove: (u: User, role: string) => Promise<void>,
    onReject: (u: User) => Promise<void>
}> = ({ user, roles, onApprove, onReject }) => {
    const { showToast } = useAppContext();
    const [selectedRole, setSelectedRole] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmReject, setConfirmReject] = useState(false);

    const handleApproveClick = async () => {
        if (!selectedRole) {
            alert('กรุณาเลือกบทบาทก่อนกดอนุมัติ'); // Simple alert here is fine for validation
            return;
        }
        setIsProcessing(true);
        try {
            await onApprove(user, selectedRole);
            showToast(`อนุมัติผู้ใช้ ${user.username} เรียบร้อย`, 'success');
        } catch (e: any) {
            showToast(`ผิดพลาด: ${e.message}`, 'error');
            setIsProcessing(false);
        }
    };

    const handleRejectClick = async () => {
        setIsProcessing(true);
        try {
            await onReject(user);
            showToast(`ปฏิเสธคำขอของ ${user.username} เรียบร้อย`, 'info');
        } catch (e: any) {
            showToast(`ผิดพลาด: ${e.message}`, 'error');
            setIsProcessing(false);
        }
    };

    return (
        <>
            <tr className="hover:bg-red-50 transition-colors border-b border-gray-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.displayName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.phoneNumber || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isProcessing ? (
                        <div className="text-primary text-xs font-bold flex items-center">
                            <SparklesIcon className="animate-spin w-4 h-4 mr-1" /> กำลังดำเนินการ...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <select 
                                className="text-xs border-gray-300 rounded-md shadow-sm py-1 focus:ring-primary focus:border-primary"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="" disabled>-- เลือก --</option>
                                {roles.filter(r => !r.isSystem || r.id === 'admin').map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <button onClick={handleApproveClick} disabled={!selectedRole} className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded disabled:bg-gray-300 shadow-sm transition-colors">อนุมัติ</button>
                            <button onClick={() => setConfirmReject(true)} className="text-red-600 border border-red-200 hover:bg-red-50 text-xs px-2 py-1 rounded transition-colors">ปฏิเสธ</button>
                        </div>
                    )}
                </td>
            </tr>
            <ConfirmModal 
                isOpen={confirmReject} 
                message={`ยืนยันลบคำขอของ "${user.username}"?`}
                onCancel={() => setConfirmReject(false)}
                onConfirm={() => { setConfirmReject(false); handleRejectClick(); }}
                isDanger
            />
        </>
    );
};

// --- Main Component ---
const UserManagement: React.FC = () => {
    const { state, dispatch, hasPermission, refreshUserList, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    
    // Modal States
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    useEffect(() => {
        refreshUserList();
    }, []);

    const activeUsers = state.users.filter(u => u.roleId !== 'pending');
    const pendingUsers = state.users.filter(u => u.roleId === 'pending');

    const handlePermissionsChange = (roleId: string, permission: Permission, checked: boolean) => {
        const currentPermissions = state.rolePermissions[roleId] || [];
        const newPermissions = checked ? [...currentPermissions, permission] : currentPermissions.filter(p => p !== permission);
        dispatch({ type: 'SET_ROLE_PERMISSIONS', payload: { ...state.rolePermissions, [roleId]: newPermissions } });
    };

    const handleApproveUser = async (user: User, targetRole: string) => {
        try {
            await updateUserRole(String(user.username), targetRole);
            await refreshUserList();
        } catch (e: any) {
            throw e;
        }
    };

    const handleRejectUser = async (user: User) => {
        try {
            await deleteUser(String(user.username));
            await refreshUserList();
        } catch (e: any) {
            throw e;
        }
    };
    
    const confirmDelete = async () => {
        if (!userToDelete) return;
         try {
            await deleteUser(String(userToDelete.username));
            await refreshUserList();
            showToast(`ลบผู้ใช้ ${userToDelete.username} สำเร็จ`, 'success');
        } catch (err: any) {
             showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        } finally {
            setUserToDelete(null);
        }
    };

    const isCurrentUser = (user: User) => state.currentUser?.username === user.username;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <h1 className="text-3xl font-bold text-app-text">จัดการผู้ใช้งาน</h1>
                 <div className="flex gap-2">
                    <button onClick={() => refreshUserList()} className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark text-sm flex items-center transition-all" disabled={state.isUsersLoading}>
                        {state.isUsersLoading ? <SparklesIcon className="animate-spin w-4 h-4 mr-2" /> : '⟳'} อัปเดตข้อมูล
                    </button>
                 </div>
            </div>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('active')} className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        ผู้ใช้งานปัจจุบัน ({activeUsers.length})
                    </button>
                    <button onClick={() => setActiveTab('pending')} className={`py-4 px-1 border-b-2 font-medium text-sm relative transition-colors ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        คำขอรออนุมัติ ({pendingUsers.length})
                        {pendingUsers.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm animate-pulse">{pendingUsers.length}</span>}
                    </button>
                </nav>
            </div>

            {activeTab === 'pending' ? (
                 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-red-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-red-800 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-red-800 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-red-800 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-red-800 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pendingUsers.map(user => (
                                <PendingUserRow 
                                    key={user.id} 
                                    user={user} 
                                    roles={state.roles} 
                                    onApprove={handleApproveUser}
                                    onReject={handleRejectUser}
                                />
                            ))}
                            {pendingUsers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">ไม่มีรายการรออนุมัติ</td></tr>}
                        </tbody>
                    </table>
                 </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activeUsers.map(user => (
                                <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isCurrentUser(user) ? 'bg-blue-50 hover:bg-blue-100' : ''}`}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                                        {user.username}
                                        {isCurrentUser(user) && <span className="text-xs bg-blue-200 text-blue-800 px-1.5 rounded">You</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.displayName || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.phoneNumber || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.roleId === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {state.roles.find(r => r.id === user.roleId)?.name || user.roleId}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                         {/* Edit Button: Visible if admin OR current user */}
                                         {(state.currentUser?.roleId === 'admin' || isCurrentUser(user)) && (
                                             <button
                                                onClick={() => setUserToEdit(user)}
                                                className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-100 rounded transition-colors"
                                                title="แก้ไขข้อมูลส่วนตัว"
                                             >
                                                 <EditIcon className="w-5 h-5" />
                                             </button>
                                         )}

                                         {/* Delete Button: Admin only, cannot delete self */}
                                         {state.currentUser?.roleId === 'admin' && !isCurrentUser(user) && (
                                            <button 
                                                onClick={() => setUserToDelete(user)} 
                                                className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-100 rounded transition-colors"
                                                title="ลบผู้ใช้งาน"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                         )}
                                    </td>
                                </tr>
                            ))}
                            {activeUsers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {hasPermission(Permission.MANAGE_ROLES) && <RoleManager />}
            
            {/* Permissions Table */}
            <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-bold mb-4">กำหนดสิทธิ์ (Permissions)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.roles.filter(role => !role.isSystem).map(role => (
                        <div key={role.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-primary mb-3 border-b pb-2">{role.name}</h3>
                            <div className="space-y-2">
                                {Object.values(Permission).map(permission => (
                                    <label key={permission} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                checked={state.rolePermissions[role.id]?.includes(permission)}
                                                onChange={(e) => handlePermissionsChange(role.id, permission, e.target.checked)}
                                            />
                                        </div>
                                        <span className="ml-2 text-sm text-gray-700">{permissionTranslations[permission]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!userToDelete}
                title="ลบผู้ใช้งาน"
                message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${userToDelete?.username}" ออกจากระบบ?`}
                onCancel={() => setUserToDelete(null)}
                onConfirm={confirmDelete}
                isDanger
                confirmText="ลบผู้ใช้งาน"
            />

            <EditUserModal 
                isOpen={!!userToEdit}
                user={userToEdit}
                onClose={() => setUserToEdit(null)}
                onSuccess={() => refreshUserList()}
            />
        </div>
    );
};

export default UserManagement;
