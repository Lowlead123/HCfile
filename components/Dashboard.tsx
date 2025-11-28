
import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { GenericData, DashboardWidget, Filter, FilterOperator, ChartType } from '../types';

const PIE_CHART_COLORS = ['#34d399', '#f87171', '#60a5fa', '#facc15', '#a78bfa', '#fb923c', '#818cf8', '#e879f9'];

const checkCondition = (itemValue: any, operator: FilterOperator, conditionValue: any): boolean => {
    if (itemValue === undefined || itemValue === null) return false;

    const itemStr = String(itemValue).toLowerCase();
    const conditionStr = String(conditionValue).toLowerCase();
    const itemNum = parseFloat(itemValue);
    const conditionNum = parseFloat(conditionValue);

    switch (operator) {
        case 'equals': return itemStr === conditionStr;
        case 'not_equals': return itemStr !== conditionStr;
        case 'contains': return itemStr.includes(conditionStr);
        case 'not_contains': return !itemStr.includes(conditionStr);
        case 'gt': return !isNaN(itemNum) && !isNaN(conditionNum) && itemNum > conditionNum;
        case 'lt': return !isNaN(itemNum) && !isNaN(conditionNum) && itemNum < conditionNum;
        case 'gte': return !isNaN(itemNum) && !isNaN(conditionNum) && itemNum >= conditionNum;
        case 'lte': return !isNaN(itemNum) && !isNaN(conditionNum) && itemNum <= conditionNum;
        default: return false;
    }
}

const KpiCard: React.FC<{ title: string, value: number }> = ({ title, value }) => (
    <div className="bg-app-background p-6 rounded-lg border border-app text-center">
        <h3 className="text-lg font-semibold text-app-text-muted">{title}</h3>
        <p className="text-5xl font-bold text-app-text mt-2">{value}</p>
    </div>
);

const BarChart: React.FC<{ title: string, data: { label: string, value: number }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-app-background p-6 rounded-lg border border-app">
            <h3 className="text-lg font-semibold text-app-text mb-4">{title}</h3>
            <div className="space-y-2">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center">
                        <span className="w-1/3 text-sm text-app-text-muted truncate pr-2">{d.label}</span>
                        <div className="w-2/3 flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-6">
                                <div
                                    className="bg-primary h-6 rounded-full text-white text-xs flex items-center justify-center"
                                    style={{ width: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }}
                                >
                                    {d.value}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                 {data.length === 0 && <p className="text-app-text-muted text-center py-4">ไม่มีข้อมูล</p>}
            </div>
        </div>
    );
};

const PieChart: React.FC<{ title: string, data: { label: string, value: number }[] }> = ({ title, data }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return (
         <div className="bg-app-background p-6 rounded-lg border border-app">
            <h3 className="text-lg font-semibold text-app-text mb-4">{title}</h3>
            <p className="text-app-text-muted">ไม่มีข้อมูล</p>
        </div>
    );

    let cumulativePercent = 0;
    const gradients = data.map((d, i) => {
        const percent = (d.value / total) * 100;
        const start = cumulativePercent;
        const end = cumulativePercent + percent;
        cumulativePercent = end;
        return `${PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]} ${start}% ${end}%`;
    }).join(', ');

    return (
         <div className="bg-app-background p-6 rounded-lg border border-app flex flex-col md:flex-row items-center">
             <div>
                <h3 className="text-lg font-semibold text-app-text mb-4">{title}</h3>
                <div className="w-32 h-32 rounded-full" style={{ background: `conic-gradient(${gradients})` }}></div>
             </div>
             <div className="md:ml-6 mt-4 md:mt-0 text-sm space-y-1">
                 {data.map((d, i) => (
                    <div key={i} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: PIE_CHART_COLORS[i % PIE_CHART_COLORS.length] }}></div>
                        <span>{d.label}: {d.value} ({((d.value/total)*100).toFixed(1)}%)</span>
                    </div>
                 ))}
             </div>
         </div>
    );
};


const Widget: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
    const { state } = useAppContext();

    const filteredData = useMemo(() => {
        const modelData = state.data[widget.modelId] || [];
        if (!widget.filters || widget.filters.length === 0) {
            return modelData;
        }
        return modelData.filter(item => {
            return widget.filters.every(filter =>
                checkCondition(item.values[filter.fieldId], filter.operator, filter.value)
            );
        });
    }, [state.data, widget.modelId, widget.filters]);

    const getChartData = () => {
        if (!widget.groupByFieldId) return [];
        const groups: { [key: string]: number } = {};
        filteredData.forEach(item => {
            const key = item.values[widget.groupByFieldId!] || 'ไม่มีข้อมูล';
            groups[key] = (groups[key] || 0) + 1;
        });
        return Object.entries(groups)
            .map(([label, value]) => ({ label, value }))
            .sort((a,b) => b.value - a.value);
    };

    switch (widget.chartType) {
        case 'KPI':
            return <KpiCard title={widget.title} value={filteredData.length} />;
        case 'BAR':
            return <BarChart title={widget.title} data={getChartData()} />;
        case 'PIE':
            return <PieChart title={widget.title} data={getChartData()} />;
        default:
            return null;
    }
};


const Dashboard: React.FC = () => {
    const { state } = useAppContext();
    return (
        <div>
            <h1 className="text-3xl font-bold text-app-text mb-6">แดชบอร์ด</h1>
            {state.dashboardWidgets.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {state.dashboardWidgets.map(widget => (
                        <Widget key={widget.id} widget={widget} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-app-background border border-app rounded-lg">
                    <p className="text-app-text-muted">ยังไม่มีวิดเจ็ตในแดชบอร์ด</p>
                    <p className="text-sm text-app-text-muted mt-2">ไปที่ "App Builder" &gt; "Dashboard" เพื่อสร้างวิดเจ็ตใหม่</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;