
import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import { ToastContainer } from './components/UI';

const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '0, 0, 0';
};

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { state } = useAppContext();

    useEffect(() => {
        const root = document.documentElement;
        if (state.theme) {
            root.style.setProperty('--color-primary', hexToRgb(state.theme.primary));
            root.style.setProperty('--color-primary-accent', hexToRgb(state.theme.primaryAccent));
            root.style.setProperty('--color-background', hexToRgb(state.theme.background));
            root.style.setProperty('--color-text-base', hexToRgb(state.theme.textBase));
            root.style.setProperty('--color-text-muted', hexToRgb(state.theme.textMuted));
            root.style.setProperty('--color-sidebar-bg', hexToRgb(state.theme.sidebarBg));
            root.style.setProperty('--color-sidebar-text', hexToRgb(state.theme.sidebarText));
            root.style.setProperty('--color-border', hexToRgb(state.theme.border));
            root.style.setProperty('--font-size-base', `${state.theme.fontSize}px`);
        }
    }, [state.theme]);

    return <>{children}</>;
};

const GlobalUI: React.FC = () => {
    const { state, dispatch } = useAppContext();
    return (
        <ToastContainer 
            toasts={state.toasts} 
            removeToast={(id) => dispatch({ type: 'REMOVE_TOAST', payload: id })} 
        />
    );
};


const AppContent: React.FC = () => {
    const { state } = useAppContext();

    if (!state.currentUser) {
        return (
            <>
                <LoginPage />
                <GlobalUI />
            </>
        );
    }

    return (
        <>
            <MainLayout />
            <GlobalUI />
        </>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </AppProvider>
    );
};

export default App;
