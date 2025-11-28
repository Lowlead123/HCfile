
import React, { useState } from 'react';
import { GenericData, DataModel, SchemaField, SchemaFieldType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { CheckIcon, SparklesIcon } from './Icons';

interface PatientFormProps {
    patient: GenericData | 'new';
    model: DataModel;
    onBack: () => void;
}

const GPSInput: React.FC<{ value: string; onChange: (value: string) => void; className: string; }> = ({ value, onChange, className }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setStatus('error');
            setError('Browser not support');
            return;
        }

        setStatus('loading');
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                setStatus('success');
            },
            (err) => {
                setStatus('error');
                setError(err.message);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div>
            <div className="flex items-center space-x-2">
                <input type="text" readOnly value={value} className={className} placeholder="Coordinates..."/>
                <button type="button" onClick={handleGetLocation} disabled={status === 'loading'} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400 whitespace-nowrap">
                    {status === 'loading' ? 'รอ...' : 'GPS'}
                </button>
            </div>
            {value && status !== 'error' && (
                 <div className="mt-2 flex items-center p-2 border border-green-300 bg-green-50 rounded-md">
                    <CheckIcon className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                    <p className="text-sm text-green-700">{value}</p>
                </div>
            )}
        </div>
    );
};


const PatientForm: React.FC<PatientFormProps> = ({ patient, model, onBack }) => {
    const { savePatient } = useAppContext();
    const isNew = patient === 'new';
    const [isSaving, setIsSaving] = useState(false);

    const getInitialData = () => {
        if (isNew) return {};
        return { ...patient.values };
    };

    const [formValues, setFormValues] = useState<{ [fieldId: string]: any }>(getInitialData());

    const handleValueChange = (fieldId: string, value: any) => {
        setFormValues(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const missingFields: string[] = [];
        for (const field of model.schema) {
            if (field.required) {
                const value = formValues[field.id];
                if (value === undefined || value === null || String(value).trim() === '') {
                    missingFields.push(field.label);
                }
            }
        }

        if (missingFields.length > 0) {
            alert(`กรุณากรอก: ${missingFields.join(', ')}`);
            return;
        }

        setIsSaving(true);

        try {
            if (isNew) {
                const newItem: GenericData = {
                    id: uuidv4(),
                    modelId: model.id,
                    values: formValues,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await savePatient(newItem);
            } else {
                const updatedItem: GenericData = {
                    ...(patient as GenericData),
                    values: formValues,
                    updatedAt: new Date().toISOString(),
                };
                await savePatient(updatedItem);
            }
            onBack();
        } catch (error: any) {
            alert('บันทึกไม่สำเร็จ: ' + error.message);
            setIsSaving(false);
        }
    };
    
    const inputClasses = "w-full p-2 border border-app rounded-md bg-app-background text-app-text";

    const renderField = (field: SchemaField) => {
        const value = formValues[field.id] || '';
        const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            handleValueChange(field.id, e.target.value);
        };

        switch (field.type) {
            case SchemaFieldType.TEXT:
                return <input type="text" value={value} onChange={onChange} required={field.required} className={inputClasses} />;
            case SchemaFieldType.TEXTAREA:
                return <textarea value={value} onChange={onChange} required={field.required} rows={4} className={inputClasses} />;
            case SchemaFieldType.NUMBER:
                return <input type="number" value={value} onChange={onChange} required={field.required} className={inputClasses} />;
            case SchemaFieldType.DATE:
                return <input type="date" value={value} onChange={onChange} required={field.required} className={inputClasses} />;
            case SchemaFieldType.GPS:
                return <GPSInput value={value} onChange={val => handleValueChange(field.id, val)} className={inputClasses} />;
            default:
                return null;
        }
    };

    return (
        <div>
            <button onClick={onBack} className="mb-6 text-primary hover:text-primary-dark font-semibold">
                &larr; กลับ
            </button>
            <form onSubmit={handleSubmit} className="bg-app-background p-8 rounded-lg border border-app max-w-2xl mx-auto space-y-6">
                 <h1 className="text-2xl font-bold text-app-text">{isNew ? `เพิ่ม${model.name}ใหม่` : `แก้ไข${model.name}`}</h1>

                {model.schema.map(field => (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-app-text-muted mb-1">
                            {field.label}{field.required ? '*' : ''}
                        </label>
                        {renderField(field)}
                    </div>
                ))}

                 <div className="flex justify-end space-x-4 pt-4">
                     <button type="button" onClick={onBack} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                         ยกเลิก
                    </button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center">
                        {isSaving ? <><SparklesIcon className="animate-spin w-4 h-4 mr-2" /> กำลังบันทึก...</> : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PatientForm;
