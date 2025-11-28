
import React, { useState } from 'react';
import { GenericData, DataModel, SchemaFieldType } from '../types';
import { CopyIcon, CheckIcon, MapPinIcon } from './Icons';

interface PatientDetailProps {
    patient: GenericData;
    model: DataModel;
    onBack: () => void;
}

const PatientDetail: React.FC<PatientDetailProps> = ({ patient, model, onBack }) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(fieldId);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const patientName = patient.values[model.nameFieldId] || 'No Name';

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="mb-6 text-primary hover:text-primary-dark font-semibold">
                &larr; กลับไปที่รายชื่อ
            </button>

            <div className="bg-app-background p-8 rounded-lg border border-app">
                <h1 className="text-3xl font-bold text-app-text mb-6">{patientName}</h1>
                
                <div className="space-y-6">
                    {model.schema.map(field => {
                        const value = patient.values[field.id] || '-';
                        const isGpsField = field.type === SchemaFieldType.GPS && typeof value === 'string' && value.includes(',');

                        return (
                            <div key={field.id} className="border-b border-gray-300 pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <label className="block text-sm font-medium text-app-text-muted">{field.label}</label>
                                        <div className="mt-1 text-md text-app-text whitespace-pre-wrap">
                                            {isGpsField ? (
                                                 <a 
                                                    href={`https://www.google.com/maps?q=${value}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-primary hover:text-primary-dark hover:underline"
                                                    title="คลิกเพื่อดูบน Google Maps"
                                                >
                                                    <MapPinIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                                                    <span className="font-mono">{value}</span>
                                                </a>
                                            ) : (
                                                value
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(String(value), field.id)}
                                        className="ml-4 p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                                        title={`คัดลอก ${field.label}`}
                                    >
                                        {copiedField === field.id ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PatientDetail;