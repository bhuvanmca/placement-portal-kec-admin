'use client';
export const runtime = 'edge';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { ArrowLeft, Users, Download, Loader2, TrendingUp, Award, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { driveService, Drive, DriveApplicant } from '@/services/drive.service';
import { toast } from 'sonner';

// Professional Layout Colors matching theme #002147
const COLORS = {
    primary: '#002147',
    secondary: '#003366',
    accent: '#E65100', // Orange for contrast
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    slate: '#64748B',
    chart: ['#002147', '#004d40', '#E65100', '#D81B60', '#1E88E5', '#3949AB', '#8E24AA']
};

export default function DriveAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const driveId = Number(params.id);

    const [drive, setDrive] = useState<Drive | null>(null);
    const [applicants, setApplicants] = useState<DriveApplicant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [driveData, applicantsData] = await Promise.all([
                    driveService.getDriveById(driveId),
                    driveService.getDriveApplicants(driveId)
                ]);
                setDrive(driveData || null);
                setApplicants(applicantsData);
            } catch (error) {
                toast.error("Failed to load analytics data");
            } finally {
                setLoading(false);
            }
        };
        if (driveId) fetchData();
    }, [driveId]);

    // --- Insight Calculations ---
    const stats = useMemo(() => {
        if (!applicants.length) return null;

        // 1. Status Breakdown
        const statusCounts: Record<string, number> = {};
        applicants.forEach(a => {
            statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        });

        const statusData = Object.keys(statusCounts).map(status => ({
            name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
            value: statusCounts[status]
        }));

        // 2. Department Distribution
        const deptCounts: Record<string, number> = {};
        applicants.forEach(a => {
            deptCounts[a.department] = (deptCounts[a.department] || 0) + 1;
        });

        const deptData = Object.keys(deptCounts).map(dept => ({
            name: dept,
            count: deptCounts[dept]
        })).sort((a, b) => b.count - a.count);

        // 3. CGPA Ranges
        const cgpaRanges = {
            '9+': 0,
            '8-9': 0,
            '7-8': 0,
            '6-7': 0,
            '<6': 0
        };

        // Average CGPA
        let totalCgpa = 0;

        applicants.forEach(a => {
            totalCgpa += a.cgpa;
            if (a.cgpa >= 9) cgpaRanges['9+']++;
            else if (a.cgpa >= 8) cgpaRanges['8-9']++;
            else if (a.cgpa >= 7) cgpaRanges['7-8']++;
            else if (a.cgpa >= 6) cgpaRanges['6-7']++;
            else cgpaRanges['<6']++;
        });

        const cgpaData = Object.keys(cgpaRanges).map(range => ({
            range,
            count: cgpaRanges[range as keyof typeof cgpaRanges]
        }));

        const avgCgpa = (totalCgpa / applicants.length).toFixed(2);

        return { statusData, deptData, cgpaData, totalApplicants: applicants.length, avgCgpa };
    }, [applicants]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-[#002147]" />
            </div>
        );
    }

    if (!drive) return <div className="p-8">Drive not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-[#002147] flex items-center gap-2">
                            Analytics: {drive.company_name}
                        </h1>
                        <p className="text-sm text-muted-foreground">Detailed insights and applicant statistics</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        // Future: Export CSV
                        toast.info("Export feature coming soon");
                    }}>
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Applicants</p>
                                    <h3 className="text-2xl font-bold mt-1 text-[#002147]">{stats?.totalApplicants || 0}</h3>
                                </div>
                                <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Average CGPA</p>
                                    <h3 className="text-2xl font-bold mt-1 text-[#002147]">{stats?.avgCgpa || '0.0'}</h3>
                                </div>
                                <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center">
                                    <Award className="h-5 w-5 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Shortlisted</p>
                                    <h3 className="text-2xl font-bold mt-1 text-[#002147]">
                                        {applicants.filter(a => a.status === 'shortlisted').length}
                                    </h3>
                                </div>
                                <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                                    <h3 className="text-2xl font-bold mt-1 text-[#002147]">
                                        {applicants.length > 0
                                            ? ((applicants.filter(a => a.status === 'placed').length / applicants.length) * 100).toFixed(1)
                                            : '0'}%
                                    </h3>
                                </div>
                                <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Department Distribution - Bar Chart */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Department Distribution</CardTitle>
                            <CardDescription>Number of applicants by department</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.deptData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Status Breakdown - Pie Chart */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Application Status</CardTitle>
                            <CardDescription>Current status of all applicants</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {stats?.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* CGPA Distribution - Area/Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>CGPA Analysis</CardTitle>
                        <CardDescription>Academic performance distribution of applicants</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.cgpaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="range" />
                                <YAxis allowDecimals={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
