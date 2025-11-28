import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Permission, GenericData, DataModel } from '../types';
import PatientForm from './PatientForm';
import PatientDetail from './PatientDetail';
import { PlusIcon, EditIcon, TrashIcon, SettingsIcon, GripVerticalIcon, SparklesIcon } from './Icons';

type ColumnSetting = {
    id: string;
    label: string;
    isVisible: boolean;
};

const PatientList: React.FC = () => {
    const { state, dispatch, hasPermission, deletePatient, refreshPatientData } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingPatient, setEditingPatient] = useState<GenericData | 'new' | null>(null);
    const [viewingPatient, setViewingPatient] = useState<GenericData | null>(null);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsColumns, setSettingsColumns] = useState<ColumnSetting[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const patientModel = useMemo(() => state.dataModels.find(m => m.id === 'patients'), [state.dataModels]);
    const patientData = useMemo(() => state.data['patients'] || [], [state.data]);

    const filteredPatients = useMemo(() => {
        if (!patientModel) return [];
        return patientData.filter(p => {
            const name = p.values[patientModel.nameFieldId] || '';
            const hnField = patientModel.schema.find(f => f.label.toLowerCase() === 'hn');
            const hn = hnField ? (p.values[hnField.id] || '') : '';
            
            return String(name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                   String(hn).toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [patientData, searchTerm, patientModel]);

    const handleDelete = async (patientId: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลคนไข้รายนี้? (การลบจะส่งผลต่อฐานข้อมูลออนไลน์)')) {
            setDeletingId(patientId);
            try {
                await deletePatient(patientId);
            } catch (e: any) {
                alert('ลบไม่สำเร็จ: ' + e.message);
            } finally {
                setDeletingId(null);
            }
        }
    };
    
    // ... Columns Logic (Same as before) ...
    const allPossibleColumns = useMemo(() => {
        if (!patientModel) return [];
        return patientModel.schema.map(f => ({ id: f.id, label: f.label }));
    }, [patientModel]);

    const visibleColumns = useMemo(() => {
        return (state.patientListVisibleColumns || [])
            .map(id => allPossibleColumns.find(c => c.id === id))
            .filter((c): c is {id: string, label: string} => !!c);
    }, [state.patientListVisibleColumns, allPossibleColumns]);

    useEffect(() => {
        if (isSettingsOpen) {
            const visibleColumnIds = new Set(state.patientListVisibleColumns);
            const orderedVisibleColumns = (state.patientListVisibleColumns || [])
                .map(id => allPossibleColumns.find(c => c.id === id))
                .filter(Boolean)
                .map(c => ({ ...(c as {id: string, label: string}), isVisible: true }));
            const hiddenColumns = allPossibleColumns
                .filter(c => !visibleColumnIds.has(c.id))
                .map(c => ({ ...c, isVisible: false }));
            setSettingsColumns([...orderedVisibleColumns, ...hiddenColumns]);
        }
    }, [isSettingsOpen, allPossibleColumns, state.patientListVisibleColumns]);
    
    const handleSettingsCheckboxChange = (id: string, isChecked: boolean) => {
        setSettingsColumns(prev => prev.map(c => c.id === id ? { ...c, isVisible: isChecked } : c));
    };

    const handleSaveColumnSettings = () => {
        const newVisibleColumns = settingsColumns.filter(c => c.isVisible).map(c => c.id);
        dispatch({ type: 'SET_PATIENT_LIST_COLUMNS', payload: newVisibleColumns });
        setIsSettingsOpen(false);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const newCols = [...settingsColumns];
        const [draggedItem] = newCols.splice(draggedIndex, 1);
        newCols.splice(index, 0, draggedItem);
        setDraggedIndex(index);
        setSettingsColumns(newCols);
    };
    
    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    if (!patientModel) return <div>Patient data model not found.</div>

    if (editingPatient) {
        return <PatientForm patient={editingPatient} model={patientModel} onBack={() => setEditingPatient(null)} />;
    }

    if (viewingPatient) {
        return <PatientDetail patient={viewingPatient} model={patientModel} onBack={() => setViewingPatient(null)} />;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-app-text">{patientModel.name}</h1>
                    {state.isDataLoading && <SparklesIcon className="w-5 h-5 text-primary animate-spin" />}
                </div>
                
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <button onClick={() => refreshPatientData()} className="p-2 bg-gray-100 rounded hover:bg-gray-200" title="Refresh">
                        ⟳
                    </button>
                    {state.currentUser?.roleId === 'admin' && (
                        <div className="relative">
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className="p-2 text-app-text-muted hover:text-app-text transition rounded-full hover:bg-gray-200"
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                            {isSettingsOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-app-background border border-app rounded-lg shadow-xl z-10">
                                    <div className="p-4 border-b border-app">
                                        <p className="font-semibold text-app-text">ตั้งค่าคอลัมน์</p>
                                    </div>
                                    <div className="p-2 max-h-80 overflow-y-auto">
                                        {settingsColumns.map((col, index) => (
                                            <div 
                                                key={col.id} 
                                                className={`flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 ${draggedIndex === index ? 'opacity-50' : ''}`}
                                                draggable
                                                onDragStart={e => handleDragStart(e, index)}
                                                onDragOver={e => handleDragOver(e, index)}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <div className="cursor-move text-app-text-muted"><GripVerticalIcon className="w-5 h-5" /></div>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={col.isVisible}
                                                    onChange={e => handleSettingsCheckboxChange(col.id, e.target.checked)}
                                                    disabled={patientModel.schema.find(f => f.id === col.id)?.isSystem}
                                                />
                                                <span className="text-sm text-app-text flex-grow">{col.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                     <div className="p-2 bg-gray-50 border-t border-app flex justify-end space-x-2">
                                        <button onClick={() => setIsSettingsOpen(false)} className="text-sm px-3 py-1">ยกเลิก</button>
                                        <button onClick={handleSaveColumnSettings} className="text-sm bg-primary text-white px-3 py-1 rounded-md">บันทึก</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                     {hasPermission(Permission.CREATE_PATIENT) && (
                        <button
                            onClick={() => setEditingPatient('new')}
                            className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition w-full md:w-auto justify-center"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            เพิ่มคนไข้ใหม่
                        </button>
                    )}
                </div>
            </div>

            {/* ERROR DISPLAY */}
            {state.dataFetchError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700 font-bold">
                                เกิดข้อผิดพลาดในการโหลดข้อมูล
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                                {state.dataFetchError}
                            </p>
                            {state.dataFetchError.includes('Unknown action') && (
                                <p className="text-xs text-red-500 mt-2">
                                    <strong>วิธีแก้:</strong> กรุณาอัปเดต Google Apps Script เป็นเวอร์ชันล่าสุด (New Version) ที่มีฟังก์ชัน "getPatients"
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="ค้นหา..."
                    className="w-full p-3 border border-app rounded-lg bg-app-background text-app-text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="hidden md:block bg-app-background rounded-lg border border-app overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-app-background">
                            <tr>
                                {visibleColumns.map(col => (
                                    <th key={col.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-app-text uppercase tracking-wider">{col.label}</th>
                                ))}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-app-text uppercase tracking-wider">วันที่บันทึก</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-app-background divide-y divide-gray-300">
                            {filteredPatients.map(patient => (
                                <tr key={patient.id} className="hover:bg-gray-100">
                                    {visibleColumns.map(col => (
                                        <td key={col.id} className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted truncate max-w-xs">
                                            {col.id === patientModel.nameFieldId ? 
                                                <button onClick={() => setViewingPatient(patient)} className="font-medium text-primary hover:text-primary-dark text-left">{patient.values[col.id]}</button> :
                                                patient.values[col.id] || '-'
                                            }
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted">{new Date(patient.createdAt).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            {hasPermission(Permission.EDIT_PATIENT) && (
                                                <button onClick={() => setEditingPatient(patient)} className="text-yellow-600 hover:text-yellow-900 p-1 rounded-full hover:bg-yellow-100"><EditIcon className="w-5 h-5" /></button>
                                            )}
                                            {hasPermission(Permission.DELETE_PATIENT) && (
                                                <button onClick={() => handleDelete(patient.id)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100" disabled={deletingId === patient.id}>
                                                    {deletingId === patient.id ? <SparklesIcon className="w-5 h-5 animate-spin" /> : <TrashIcon className="w-5 h-5" />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredPatients.length === 0 && !state.dataFetchError && <p className="text-center text-app-text-muted py-8">ไม่พบข้อมูล {state.isDataLoading && '(กำลังโหลด...)'}</p>}
            </div>

            <div className="md:hidden space-y-4">
                {filteredPatients.map(patient => {
                    const name = patient.values[patientModel.nameFieldId];
                    const hnField = patientModel.schema.find(f => f.label.toLowerCase() === 'hn');
                    const hn = hnField ? patient.values[hnField.id] : '';
                    return (
                        <div key={patient.id} className="bg-app-background rounded-lg border border-app p-4 space-y-2">
                             <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <button onClick={() => setViewingPatient(patient)} className="font-bold text-lg text-primary hover:text-primary-dark text-left">{name}</button>
                                    <p className="text-sm text-app-text-muted">HN: {hn}</p>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                    {hasPermission(Permission.EDIT_PATIENT) && (
                                        <button onClick={() => setEditingPatient(patient)} className="text-yellow-600 hover:text-yellow-900 p-1"><EditIcon className="w-5 h-5" /></button>
                                    )}
                                    {hasPermission(Permission.DELETE_PATIENT) && (
                                        <button onClick={() => handleDelete(patient.id)} className="text-red-600 hover:text-red-900 p-1">
                                            {deletingId === patient.id ? <SparklesIcon className="w-5 h-5 animate-spin" /> : <TrashIcon className="w-5 h-5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PatientList;