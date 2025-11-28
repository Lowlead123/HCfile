
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { UserIcon, LockIcon, SparklesIcon, XIcon, CheckIcon } from './Icons';
import { registerUser, getSystemStatus } from '../services/sheetService';
import { GITHUB_CONFIG } from '../services/githubConfig'; // Import config to show repo name

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    
    // System Status
    const [systemStatus, setSystemStatus] = useState<'checking' | 'ok' | 'empty' | 'error'>('checking');
    const [statusMsg, setStatusMsg] = useState('');

    const { state, login } = useAppContext();

    useEffect(() => {
        const checkSystem = async () => {
            setSystemStatus('checking');
            const result = await getSystemStatus();
            if (result.isConnected) {
                if (result.userCount === 0) {
                    setSystemStatus('empty');
                } else {
                    setSystemStatus('ok');
                }
            } else {
                setSystemStatus('error');
                setStatusMsg(result.error || 'Connection Failed');
            }
        };
        checkSystem();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        try {
            await login(username, password);
        } catch (error: any) {
            setLocalError(error.message || 'เข้าสู่ระบบไม่สำเร็จ');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-app-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h1 className="text-center text-4xl font-bold text-primary">HC Patient Manager</h1>
                    <h2 className="mt-6 text-center text-2xl font-extrabold text-app-text">
                        ลงชื่อเข้าสู่ระบบ
                    </h2>
                    <p className="mt-2 text-center text-sm text-app-text-muted">
                        GitHub Database Mode
                    </p>
                </div>

                {/* System Status Banner */}
                {systemStatus === 'checking' && (
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm text-center flex items-center justify-center">
                        <SparklesIcon className="animate-spin w-4 h-4 mr-2"/> กำลังเชื่อมต่อฐานข้อมูล...
                    </div>
                )}
                {systemStatus === 'error' && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm text-center border border-red-200">
                        <p className="font-bold">❌ เชื่อมต่อ GitHub ไม่สำเร็จ</p>
                        <p className="text-xs mt-1 mb-2">{statusMsg}</p>
                        
                        {/* Helper Button for Missing Repo */}
                        {statusMsg.includes('ไม่พบ Repository') && (
                            <div className="mt-2">
                                <a 
                                    href="https://github.com/new" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
                                >
                                    🛠️ กดที่นี่เพื่อสร้าง Repository: {GITHUB_CONFIG.REPO}
                                </a>
                                <p className="text-[10px] mt-1 text-red-600 opacity-80">
                                    *อย่าลืมติ๊กช่อง "Add a README file" ตอนสร้างด้วยนะครับ
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {systemStatus === 'empty' && (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm border border-yellow-200 animate-pulse">
                        <p className="font-bold text-lg mb-1">🎉 ยินดีต้อนรับ!</p>
                        <p>ฐานข้อมูลยังว่างเปล่า <br/> กรุณากดปุ่ม <strong>"สมัครสมาชิกใหม่"</strong> ด้านล่าง</p>
                        <p className="text-xs mt-2 text-yellow-700">*คนแรกที่สมัคร จะได้รับสิทธิ์ Admin ทันที</p>
                    </div>
                )}
                {systemStatus === 'ok' && (
                    <div className="bg-green-50 text-green-700 p-2 rounded-md text-xs text-center border border-green-200 flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 mr-1" /> 🟢 ระบบพร้อมใช้งาน
                    </div>
                )}

                <form className="mt-8 space-y-6 bg-app-background p-8 rounded-lg border border-app" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="username"
                                type="text"
                                required
                                disabled={state.isUsersLoading || systemStatus === 'checking'}
                                className="appearance-none block w-full px-3 py-2 pl-10 border border-app rounded-md placeholder-gray-500 text-app-text focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-app-background disabled:bg-gray-100"
                                placeholder="ชื่อผู้ใช้ (ID)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LockIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                disabled={state.isUsersLoading || systemStatus === 'checking'}
                                className="appearance-none block w-full px-3 py-2 pl-10 border border-app rounded-md placeholder-gray-500 text-app-text focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-app-background disabled:bg-gray-100"
                                placeholder="รหัสผ่าน"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {(localError || state.userFetchError) && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-600 text-center">
                            {localError || state.userFetchError}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={state.isUsersLoading || systemStatus !== 'ok'}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {state.isUsersLoading ? (
                                <span className="flex items-center">
                                    <SparklesIcon className="w-4 h-4 mr-2 animate-spin" />
                                    กำลังตรวจสอบ...
                                </span>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                        
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-300"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">หรือ</span>
                            <div className="flex-grow border-t border-gray-300"></div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsRegistering(true)}
                            disabled={systemStatus === 'checking' || systemStatus === 'error'}
                            className={`w-full flex justify-center py-2 px-4 border text-sm font-medium rounded-md focus:outline-none ${
                                systemStatus === 'empty' 
                                    ? 'border-transparent bg-yellow-400 text-yellow-900 hover:bg-yellow-500 shadow-md animate-bounce-short' 
                                    : 'border-primary text-primary bg-white hover:bg-gray-50'
                            }`}
                        >
                            {systemStatus === 'empty' ? '✨ สมัครสมาชิกคนแรก (Admin) ✨' : 'สมัครสมาชิกใหม่'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Register Modal */}
            {isRegistering && (
                <RegisterModal onClose={() => {
                    setIsRegistering(false);
                    // Re-check system status after modal close in case they registered
                    getSystemStatus().then(res => {
                         if (res.isConnected && res.userCount > 0) setSystemStatus('ok');
                    });
                }} />
            )}
        </div>
    );
};

const RegisterModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        phoneNumber: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setStatus('error');
            setErrorMsg('❌ รหัสผ่านไม่ตรงกัน');
            return;
        }
        
        setStatus('loading');
        setErrorMsg('');
        
        try {
            await registerUser({
                username: formData.username,
                password: formData.password,
                displayName: formData.displayName,
                phoneNumber: formData.phoneNumber
            });
            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative transform transition-all scale-100">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">📝 สมัครสมาชิกใหม่</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {status === 'success' ? (
                    <div className="p-8 text-center animate-fade-in">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 shadow-inner">
                            <SparklesIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">ลงทะเบียนสำเร็จ!</h3>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            ข้อมูลถูกบันทึกลง GitHub Database เรียบร้อยแล้ว<br/>
                            <span className="text-primary font-medium">คุณสามารถเข้าสู่ระบบได้ทันที</span>
                        </p>
                        <button onClick={onClose} className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark shadow-md transition-all font-medium">
                            ไปหน้า Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {status === 'error' && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start">
                                <span className="mr-2 mt-0.5">⚠️</span>
                                <span className="break-words">{errorMsg}</span>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อผู้ใช้ (ID) <span className="text-red-500">*</span></label>
                            <input required type="text" className="block w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                placeholder="เช่น user01"
                                value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผ่าน <span className="text-red-500">*</span></label>
                                <input required type="password" className="block w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                    placeholder="******"
                                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
                                <input required type="password" className="block w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                    placeholder="******"
                                    value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อ-สกุล (สำหรับแสดงผล) <span className="text-red-500">*</span></label>
                            <input required type="text" className="block w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                placeholder="เช่น สมชาย ใจดี"
                                value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                            <input type="tel" className="block w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                placeholder="08x-xxx-xxxx"
                                value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                        </div>

                        <button 
                            type="submit" 
                            disabled={status === 'loading'}
                            className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed mt-6 font-bold shadow-md transition-all flex justify-center items-center"
                        >
                            {status === 'loading' ? (
                                <>
                                    <SparklesIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                                    กำลังบันทึก...
                                </>
                            ) : 'ยืนยันการสมัคร'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
