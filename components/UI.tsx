
import React, { useEffect, useState } from 'react';
import { ToastMessage, ToastType } from '../types';
import { CheckIcon, XIcon, SparklesIcon } from './Icons';

// --- Toast Component ---
interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col space-y-3 pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage, onClose: () => void }> = ({ toast, onClose }) => {
    // Auto-dismiss logic inside the item
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // 5 seconds
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const bgClass = 
        toast.type === 'success' ? 'bg-white border-l-4 border-green-500' : 
        toast.type === 'error' ? 'bg-white border-l-4 border-red-500' :
        'bg-white border-l-4 border-blue-500';

    const iconColor = 
        toast.type === 'success' ? 'text-green-500' : 
        toast.type === 'error' ? 'text-red-500' :
        'text-blue-500';

    return (
        <div className={`pointer-events-auto transform transition-all duration-300 ease-in-out hover:scale-102 shadow-lg rounded-md p-4 flex items-start w-80 max-w-sm ${bgClass} animate-fade-in-down`}>
            <div className={`mr-3 mt-0.5 ${iconColor}`}>
                {toast.type === 'success' ? <CheckIcon className="w-5 h-5"/> : 
                 toast.type === 'error' ? <XIcon className="w-5 h-5"/> : 
                 <SparklesIcon className="w-5 h-5"/>}
            </div>
            <div className="flex-grow text-sm text-gray-800 font-medium">
                {toast.message}
            </div>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

// --- Modal Component ---
interface ModalProps {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, children, onClose, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all scale-100 animate-bounce-short overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Confirm Modal Component ---
interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, title = "ยืนยันการทำรายการ", message, 
    confirmText = "ยืนยัน", cancelText = "ยกเลิก", 
    isDanger = false, onConfirm, onCancel, isLoading 
}) => {
    return (
        <Modal 
            isOpen={isOpen} 
            title={title} 
            onClose={onCancel}
            footer={
                <>
                    <button 
                        onClick={onCancel} 
                        disabled={isLoading}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors text-sm font-medium"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg text-white shadow-md focus:outline-none focus:ring-2 transition-colors text-sm font-medium flex items-center ${
                            isDanger 
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                                : 'bg-primary hover:bg-primary-dark focus:ring-teal-500'
                        }`}
                    >
                        {isLoading && <SparklesIcon className="animate-spin w-4 h-4 mr-2" />}
                        {confirmText}
                    </button>
                </>
            }
        >
            <p className="text-gray-600 text-sm leading-relaxed">
                {message}
            </p>
        </Modal>
    );
};
