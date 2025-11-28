
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DataModel, SchemaField, SchemaFieldType, ThemeSettings, NavigationItem, TargetType, Permission, CustomPage, DashboardWidget, Filter, ChartType, FilterOperator } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, TrashIcon, GripVerticalIcon, EditIcon, CheckIcon, XIcon, FileTextIcon, BarChartIcon, SettingsIcon, UsersIcon } from './Icons';

type Tab = 'data' | 'pages' | 'nav' | 'appearance' | 'dashboard';

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none whitespace-nowrap ${
            isActive ? 'border-b-2 border-primary text-primary' : 'text-app-text-muted hover:text-app-text'
        }`}
    >
        {label}
    </button>
);

const AppBuilder: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('data');

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-app-text mb-6">App Builder</h1>

            <div className="border-b border-gray-300 mb-6">
                <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto">
                    <TabButton label="Data Models" isActive={activeTab === 'data'} onClick={() => setActiveTab('data')} />
                    <TabButton label="Pages & Navigation" isActive={activeTab === 'pages'} onClick={() => setActiveTab('pages')} />
                    <TabButton label="Appearance" isActive={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
                    <TabButton label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                </nav>
            </div>

            <div>
                {activeTab === 'data' && <DataModelEditor />}
                {activeTab === 'pages' && <div><PageEditor /><NavigationEditor /></div>}
                {activeTab === 'appearance' && <AppearanceEditor />}
                {activeTab === 'dashboard' && <DashboardEditor />}
            </div>
        </div>
    );
};

// Data Model Editor Component
const DataModelEditor: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [models, setModels] = useState<DataModel[]>(state.dataModels);

    const handleSave = () => {
        dispatch({ type: 'SET_DATA_MODELS', payload: models });
        alert('Data Models saved successfully!');
    };
    
    // Placeholder for actual component
    return (
        <div className="bg-app-background p-6 rounded-lg border border-app">
            <h2 className="text-xl font-semibold text-app-text mb-4">Data Models</h2>
            <p className="text-app-text-muted mb-4">Define the structure of your data, like patients, appointments, or inventory.</p>
            {/* Simple display for now. A full editor would be complex. */}
            <div className="space-y-2">
            {models.map(model => (
                <div key={model.id} className="p-3 border border-app rounded">
                    <p className="font-bold">{model.name}</p>
                    <p className="text-sm text-app-text-muted">{model.schema.length} fields</p>
                </div>
            ))}
            </div>
             <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md mt-4">
                <strong>Note:</strong> A full visual editor for creating and modifying data models is a complex feature. For now, the "Patients" model is provided and its schema can be modified here. Adding new models would require further development.
            </p>
            {/* This is where a full-fledged model builder would go */}
            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark">Save Data Models</button>
            </div>
        </div>
    );
};


// Page and Navigation Editor
const PageEditor: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [pages, setPages] = useState<CustomPage[]>(state.customPages);
    
    const handleAddPage = () => setPages([...pages, { id: uuidv4(), title: 'New Page', content: 'Page content goes here.' }]);
    const handleDeletePage = (id: string) => setPages(pages.filter(p => p.id !== id));
    const handleUpdatePage = (updatedPage: CustomPage) => setPages(pages.map(p => p.id === updatedPage.id ? updatedPage : p));

    const handleSave = () => {
        dispatch({ type: 'SET_CUSTOM_PAGES', payload: pages });
        alert('Pages saved successfully!');
    };

    return (
         <div className="bg-app-background p-6 rounded-lg border border-app mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-app-text">Custom Pages</h2>
                <button onClick={handleAddPage} className="flex items-center text-sm text-primary hover:text-primary-dark"><PlusIcon className="w-4 h-4 mr-1"/> Add Page</button>
            </div>
            <div className="space-y-4">
                {pages.map(page => (
                    <div key={page.id} className="space-y-2 p-3 border border-app rounded">
                        <div className="flex justify-between items-center">
                            <input type="text" value={page.title} onChange={e => handleUpdatePage({...page, title: e.target.value})} className="font-bold text-lg p-1 border-b w-full" />
                            <button onClick={() => handleDeletePage(page.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                        <textarea value={page.content} onChange={e => handleUpdatePage({...page, content: e.target.value})} rows={3} className="w-full p-2 border border-app rounded-md bg-app-background" />
                    </div>
                ))}
            </div>
            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark">Save Pages</button>
            </div>
        </div>
    );
};

const NavigationEditor: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [navItems, setNavItems] = useState<NavigationItem[]>(state.navigation);

    const handleSave = () => {
        dispatch({ type: 'SET_NAVIGATION', payload: navItems });
        alert('Navigation saved successfully!');
    };
    
    // This is a simplified version of the old navigation settings
    return (
         <div className="bg-app-background p-6 rounded-lg border border-app">
            <h2 className="text-xl font-semibold text-app-text mb-4">Navigation Menu</h2>
            <div className="space-y-2">
                {navItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border border-app rounded-md">
                        <GripVerticalIcon className="w-5 h-5 text-gray-400 cursor-move" />
                        <input type="text" value={item.label} onChange={e => setNavItems(navItems.map(i => i.id === item.id ? {...i, label: e.target.value} : i))} className="p-1 border border-app rounded bg-app-background flex-grow" />
                    </div>
                ))}
            </div>
            <p className="text-sm text-app-text-muted mt-4">Note: Custom pages are automatically added to the navigation. Reordering and icon selection will be available in a future update.</p>
            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark">Save Navigation</button>
            </div>
        </div>
    );
};

// Appearance Editor
const AppearanceEditor: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [theme, setTheme] = useState<ThemeSettings>(state.theme);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setTheme({ ...theme, [name]: type === 'number' ? parseInt(value, 10) || 0 : value });
    };

    const handleSave = () => {
        dispatch({ type: 'SET_THEME', payload: theme });
        alert('Appearance settings saved!');
    };
    
    return (
        <div className="bg-app-background p-6 rounded-lg border border-app">
            <h2 className="text-xl font-semibold text-app-text mb-4">Appearance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <ColorInput label="Primary Accent" name="primaryAccent" value={theme.primaryAccent} onChange={handleChange} />
                <ColorInput label="Background" name="background" value={theme.background} onChange={handleChange} />
                <ColorInput label="Text (Base)" name="textBase" value={theme.textBase} onChange={handleChange} />
                <ColorInput label="Text (Muted)" name="textMuted" value={theme.textMuted} onChange={handleChange} />
                <ColorInput label="Sidebar BG" name="sidebarBg" value={theme.sidebarBg} onChange={handleChange} />
                <ColorInput label="Sidebar Text" name="sidebarText" value={theme.sidebarText} onChange={handleChange} />
                <NumberInput label="Font Size (px)" name="fontSize" value={theme.fontSize} onChange={handleChange} />
            </div>
             <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark">Save Appearance</button>
            </div>
        </div>
    );
};

const ColorInput: React.FC<{label: string, name: keyof Omit<ThemeSettings, 'fontSize'>, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = 
({ label, name, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-app-text-muted mb-1">{label}</label>
        <div className="flex items-center"><input type="color" name={name} value={value} onChange={onChange} className="w-10 h-10 p-1 border border-app rounded-md"/><input type="text" name={name} value={value} onChange={onChange} className="ml-2 w-full p-2 border border-app rounded-md bg-app-background"/></div>
    </div>
);

const NumberInput: React.FC<{label: string, name: 'fontSize', value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = 
({ label, name, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-app-text-muted mb-1">{label}</label>
        <input type="number" name={name} value={value} onChange={onChange} className="w-full p-2 border border-app rounded-md bg-app-background"/>
    </div>
);


// Dashboard Editor (adapted from DashboardBuilder)
const DashboardEditor: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [widgets, setWidgets] = useState<DashboardWidget[]>(state.dashboardWidgets);
    const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

    const handleAddNew = () => {
        const newWidget: DashboardWidget = {
            id: uuidv4(), title: 'New Widget', modelId: 'patients', chartType: 'KPI', filters: []
        };
        setEditingWidget(newWidget);
    };

    const handleSaveWidget = (widgetToSave: DashboardWidget) => {
        const exists = widgets.some(w => w.id === widgetToSave.id);
        const newWidgets = exists 
            ? widgets.map(w => w.id === widgetToSave.id ? widgetToSave : w)
            : [...widgets, widgetToSave];
        setWidgets(newWidgets);
        setEditingWidget(null);
    };

    const handleDeleteWidget = (id: string) => {
        if(window.confirm('Delete this widget?')) {
            setWidgets(widgets.filter(w => w.id !== id));
        }
    };

    const handleSaveAll = () => {
        dispatch({ type: 'SET_DASHBOARD_WIDGETS', payload: widgets });
        alert('Dashboard saved!');
    };

    if (editingWidget) {
        return <WidgetEditor widget={editingWidget} onSave={handleSaveWidget} onCancel={() => setEditingWidget(null)} />;
    }

    return (
        <div className="bg-app-background p-6 rounded-lg border border-app">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-app-text">Dashboard Widgets</h2>
                <button onClick={handleAddNew} className="flex items-center text-sm bg-primary text-white px-3 py-1 rounded-md hover:bg-primary-dark"><PlusIcon className="w-4 h-4 mr-1"/> Add Widget</button>
            </div>
            <div className="space-y-2">
                {widgets.map(w => (
                    <div key={w.id} className="flex justify-between items-center p-3 border border-app rounded-md">
                        <div>
                            <p className="font-semibold">{w.title}</p>
                            <p className="text-sm text-app-text-muted">{w.chartType} on "{state.dataModels.find(m => m.id === w.modelId)?.name || 'Unknown'}"</p>
                        </div>
                        <div className="space-x-2">
                            <button onClick={() => setEditingWidget(w)} className="p-1 text-yellow-600"><EditIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleDeleteWidget(w.id)} className="p-1 text-red-500"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                ))}
            </div>
             <div className="mt-8 text-right">
                <button onClick={handleSaveAll} className="px-6 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark">Save Dashboard</button>
            </div>
        </div>
    );
};

const WidgetEditor: React.FC<{widget: DashboardWidget, onSave: (w: DashboardWidget) => void, onCancel: () => void}> = ({ widget, onSave, onCancel }) => {
    const { state } = useAppContext();
    const [local, setLocal] = useState(widget);
    const selectedModel = state.dataModels.find(m => m.id === local.modelId);
    
    // Simplified version
    return (
        <div className="p-4 border-2 border-primary rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Edit Widget</h3>
            <div>
                <label className="text-sm font-medium">Title</label>
                <input type="text" value={local.title} onChange={e => setLocal({...local, title: e.target.value})} className="w-full p-2 border border-app rounded-md bg-app-background" />
            </div>
            <div>
                <label className="text-sm font-medium">Data Model</label>
                 <select value={local.modelId} onChange={e => setLocal({...local, modelId: e.target.value})} className="w-full p-2 border border-app rounded-md bg-app-background">
                    {state.dataModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm font-medium">Chart Type</label>
                 <select value={local.chartType} onChange={e => setLocal({...local, chartType: e.target.value as ChartType})} className="w-full p-2 border border-app rounded-md bg-app-background">
                    <option value="KPI">KPI</option><option value="BAR">Bar Chart</option><option value="PIE">Pie Chart</option>
                </select>
            </div>
            {(local.chartType === 'BAR' || local.chartType === 'PIE') && selectedModel && (
                <div>
                    <label className="text-sm font-medium">Group By</label>
                    <select value={local.groupByFieldId} onChange={e => setLocal({...local, groupByFieldId: e.target.value})} className="w-full p-2 border border-app rounded-md bg-app-background">
                        <option value="">-- Select Field --</option>
                        {selectedModel.schema.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                </div>
            )}
             <div className="flex justify-end space-x-2">
                <button onClick={onCancel} className="px-3 py-1 bg-gray-200 rounded-md text-sm">Cancel</button>
                <button onClick={() => onSave(local)} className="px-3 py-1 bg-primary text-white rounded-md text-sm">Save</button>
            </div>
        </div>
    );
};


export default AppBuilder;
