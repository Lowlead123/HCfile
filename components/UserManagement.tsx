
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Role, Permission, User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon, SparklesIcon } from './Icons';
import { updateUserRole, deleteUser } from '../services/sheetService';

const permissionTranslations: Record<Permission, string> = {
    [Permission.VIEW_PATIENTS]: 'ดูข้อมูลคนไข้',
    [Permission.CREATE_PATIENT]: 'สร้างข้อมูลคนไข้',
    [Permission.EDIT_PATIENT]: 'แก้ไขข้อมูลคนไข้',
    [Permission.DELETE_PATIENT]: 'ลบข้อมูลคนไข้',
    [Permission.MANAGE_USERS]: 'จัดการผู้ใช้งาน',
    [Permission.MANAGE_ROLES]: 'จัดการบทบาท',
    [Permission.MANAGE_APP_BUILDER]: 'เข้าถึง App Builder',
};

// --- Components ---
const RoleManager: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState('');

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
        handleCancel();
    };
    
    const handleAddRole = () => {
        const newName = prompt('กรุณาใส่ชื่อบทบาทใหม่:');
        if (newName && newName.trim() !== '') {
            const newRole: Role = { id: uuidv4(), name: newName.trim() };
            dispatch({ type: 'SET_ROLES', payload: [...state.roles, newRole] });
            dispatch({ type: 'SET_ROLE_PERMISSIONS', payload: { ...state.rolePermissions, [newRole.id]: [] } });
        }
    };
    
    const handleDeleteRole = (role: Role) => {
        if (usersPerRole[role.id] > 0) {
            alert('ไม่สามารถลบบทบาทนี้ได้เนื่องจากมีผู้ใช้งานที่ได้รับมอบหมาย');
            return;
        }
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบทบาท "${role.name}"?`)) {
            const newRoles = state.roles.filter(r => r.id !== role.id);
            const newPermissions = { ...state.rolePermissions };
            delete newPermissions[role.id];
            dispatch({ type: 'SET_ROLES', payload: newRoles });
            dispatch({ type: 'SET_ROLE_PERMISSIONS', payload: newPermissions });
        }
    };

    return (
        <div className="bg-app-background rounded-lg border border-app overflow-hidden mb-8">
            <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold text-app-text">จัดการบทบาท (Roles)</h2>
                <button onClick={handleAddRole} className="flex items-center text-sm bg-primary text-white px-3 py-1 rounded-md hover:bg-primary-dark">
                    <PlusIcon className="w-4 h-4 mr-1"/> เพิ่มบทบาท
                </button>
            </div>
            <div className="divide-y divide-gray-300">
                {state.roles.map(role => (
                    <div key={role.id} className="p-4 flex justify-between items-center">
                        {editingRole?.id === role.id ? (
                            <div className="flex-grow flex items-center gap-2">
                                <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)} className="p-1 border border-app rounded-md" />
                                <button onClick={handleSave} className="p-1 text-green-600"><CheckIcon className="w-5 h-5"/></button>
                                <button onClick={handleCancel} className="p-1 text-red-600"><XIcon className="w-5 h-5"/></button>
                            </div>
                        ) : (
                            <div className="font-medium text-app-text">{role.name} {role.isSystem && <span className="text-xs text-app-text-muted">(System)</span>}</div>
                        )}
                        <div className="flex items-center space-x-2">
                           <span className="text-sm text-app-text-muted">({usersPerRole[role.id] || 0} users)</span>
                            {!role.isSystem && (
                                <>
                                <button onClick={() => handleEdit(role)} className="text-yellow-600 hover:text-yellow-900 p-1"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeleteRole(role)} className="text-red-600 hover:text-red-900 p-1" disabled={usersPerRole[role.id] > 0}><TrashIcon className="w-5 h-5"/></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const PendingUserRow: React.FC<{ 
    user: User, 
    roles: Role[], 
    onApprove: (u: User, role: string) => Promise<void>,
    onReject: (u: User) => Promise<void>
}> = ({ user, roles, onApprove, onReject }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [msg, setMsg] = useState('');

    const handleApproveClick = async () => {
        if (!selectedRole) {
            alert('กรุณาเลือกบทบาทก่อนกดอนุมัติ');
            return;
        }
        setIsProcessing(true);
        setMsg('กำลังบันทึก...');
        try {
            await onApprove(user, selectedRole);
        } catch (e: any) {
            setMsg(`❌ ผิดพลาด: ${e.message}`);
            setIsProcessing(false);
        }
    };

    const handleRejectClick = async () => {
        if (!window.confirm(`ยืนยันลบ "${user.username}"?`)) return;
        setIsProcessing(true);
        setMsg('กำลังลบ...');
        try {
            await onReject(user);
        } catch (e: any) {
            setMsg(`❌ ผิดพลาด: ${e.message}`);
            setIsProcessing(false);
        }
    };

    return (
        <tr className="hover:bg-red-50 transition-colors border-b border-gray-100">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.username}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.displayName || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.phoneNumber || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                {isProcessing ? (
                    <div className="text-primary text-xs font-bold flex items-center">
                        <SparklesIcon className="animate-spin w-4 h-4 mr-1" /> {msg}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <select 
                            className="text-xs border-gray-300 rounded-md shadow-sm py-1"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="" disabled>-- เลือก --</option>
                            {roles.filter(r => !r.isSystem || r.id === 'admin').map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <button onClick={handleApproveClick} disabled={!selectedRole} className="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded disabled:bg-gray-300">อนุมัติ</button>
                        <button onClick={handleRejectClick} className="text-red-600 border border-red-200 hover:bg-red-50 text-xs px-2 py-1 rounded">ปฏิเสธ</button>
                    </div>
                )}
            </td>
        </tr>
    );
};

// --- Main Component ---
const UserManagement: React.FC = () => {
    const { state, dispatch, hasPermission, refreshUserList } = useAppContext();
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
            throw e;
        }
    };

    const handleRejectUser = async (user: User) => {
        try {
            await deleteUser(String(user.username));
            await refreshUserList();
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e.message}`);
            throw e;
        }
    };
    
    const handleDeleteActiveUser = async (user: User) => {
         if (!window.confirm(`ยืนยันลบผู้ใช้งาน ${user.username} ออกจากระบบ?`)) return;
         
         setDeletingIds(prev => new Set(prev).add(user.id));
         
         try {
            await deleteUser(String(user.username));
            await refreshUserList();
        } catch (err: any) {
             alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(user.id);
                return next;
            });
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <h1 className="text-3xl font-bold text-app-text">จัดการผู้ใช้งาน</h1>
                 <div className="flex gap-2">
                    <button onClick={() => refreshUserList()} className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark text-sm flex items-center" disabled={state.isUsersLoading}>
                        {state.isUsersLoading ? <SparklesIcon className="animate-spin w-4 h-4 mr-2" /> : '⟳'} อัปเดตข้อมูล
                    </button>
                 </div>
            </div>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('active')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                        ผู้ใช้งานปัจจุบัน ({activeUsers.length})
                    </button>
                    <button onClick={() => setActiveTab('pending')} className={`py-4 px-1 border-b-2 font-medium text-sm relative ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                        คำขอรออนุมัติ ({pendingUsers.length})
                        {pendingUsers.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 rounded-full">{pendingUsers.length}</span>}
                    </button>
                </nav>
            </div>

            {activeTab === 'pending' ? (
                 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-red-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Action</th>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activeUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.displayName || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.phoneNumber || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.roleId === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {state.roles.find(r => r.id === user.roleId)?.name || user.roleId}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                         {user.roleId !== 'admin' && (
                                            <button 
                                                onClick={() => handleDeleteActiveUser(user)} 
                                                className="text-red-600 hover:text-red-900 p-1 bg-red-50 rounded disabled:opacity-50"
                                                disabled={deletingIds.has(user.id)}
                                                title="ลบผู้ใช้งาน"
                                            >
                                                {deletingIds.has(user.id) ? (
                                                    <SparklesIcon className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <TrashIcon className="w-5 h-5" />
                                                )}
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
                        <div key={role.id} className="border rounded p-4 bg-white">
                            <h3 className="font-bold text-primary mb-2">{role.name}</h3>
                            <div className="space-y-1">
                                {Object.values(Permission).map(permission => (
                                    <label key={permission} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-primary rounded mr-2"
                                            checked={state.rolePermissions[role.id]?.includes(permission)}
                                            onChange={(e) => handlePermissionsChange(role.id, permission, e.target.checked)}
                                        />
                                        <span className="text-sm">{permissionTranslations[permission]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
