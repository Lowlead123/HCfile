
import React from 'react';
import { CustomPage } from '../types';

interface CustomPageViewProps {
    page: CustomPage;
}

const CustomPageView: React.FC<CustomPageViewProps> = ({ page }) => {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-app-text mb-6">{page.title}</h1>
            <div className="bg-app-background p-8 rounded-lg border border-app">
                <p className="text-app-text whitespace-pre-wrap">{page.content}</p>
            </div>
        </div>
    );
};

export default CustomPageView;
