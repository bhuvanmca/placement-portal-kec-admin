'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  FileText, FileSpreadsheet, TrendingUp, Users, Briefcase, GraduationCap, Building2, UserCircle, DollarSign, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import api from '@/lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface YearWiseAnalytics {
    batch_year: number;
    total_students: number;
    interested_students: number;
    placed_students: number;
    placement_percentage: number;
    total_offers: number;
}

interface DepartmentWiseAnalytics {
    department_code: string;
    total_students: number;
    interested_students: number;
    placed_students: number;
    placement_percentage: number;
}

interface GenderWiseAnalytics {
    gender: string;
    placed_students: number;
}

interface CategoryWiseAnalytics {
    category: string;
    placed_students: number;
}

interface OfferTypeAnalytics {
    offer_type: string;
    placed_students: number;
}

interface SalaryBracketAnalytics {
    bracket: string;
    placed_students: number;
}

interface TopRecruitersAnalytics {
    company_name: string;
    placed_students: number;
}

interface DashboardAnalytics {
    year_wise: YearWiseAnalytics[];
    department_wise: DepartmentWiseAnalytics[];
    gender_wise: GenderWiseAnalytics[];
    category_wise: CategoryWiseAnalytics[];
    offer_type_wise: OfferTypeAnalytics[];
    salary_wise: SalaryBracketAnalytics[];
    top_recruiters: TopRecruitersAnalytics[];
}

const COLORS = ['#002147', '#003366', '#1a5276', '#2e86c1', '#5dade2', '#85c1e9', '#aed6f1', '#d4e6f1'];
const SALARY_COLORS = ['#002147', '#1a5276', '#2e86c1', '#5dade2'];

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all_time');

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const fetchAnalytics = async (selectedTimeframe: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/v1/admin/analytics/dashboard?timeframe=${selectedTimeframe}`);
      
      const dashboardData = response.data as DashboardAnalytics;
      // Sort year wise chronologically
      dashboardData.year_wise = (dashboardData.year_wise || []).sort((a, b) => a.batch_year - b.batch_year);
      
      setData(dashboardData);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data) return;
    
    // Create CSV content for each section
    let csvContent = `KEC PLACEMENT ANALYTICS REPORT (${timeframe.toUpperCase()})\n\n`;

    // 1. Year Wise
    csvContent += "=== YEAR WISE ANALYTICS ===\n";
    csvContent += "Batch Year,Total Students,Interested Students,Placed Students,Placement %,Total Offers\n";
    (data.year_wise || []).forEach(row => {
      csvContent += `${row.batch_year},${row.total_students},${row.interested_students},${row.placed_students},${(row.placement_percentage || 0).toFixed(2)},${row.total_offers}\n`;
    });
    csvContent += "\n";

    // 2. Department Wise
    csvContent += "=== DEPARTMENT WISE ANALYTICS ===\n";
    csvContent += "Department,Total Students,Interested Students,Placed Students,Placement %\n";
    (data.department_wise || []).forEach(row => {
      csvContent += `${row.department_code},${row.total_students},${row.interested_students},${row.placed_students},${(row.placement_percentage || 0).toFixed(2)}\n`;
    });
    csvContent += "\n";

    // 3. Gender Wise
    csvContent += "=== GENDER WISE PLACEMENTS ===\n";
    csvContent += "Gender,Placed Students\n";
    (data.gender_wise || []).forEach(row => {
      csvContent += `${row.gender},${row.placed_students}\n`;
    });
    csvContent += "\n";

    // 4. Category Wise
    csvContent += "=== COMPANY CATEGORY WISE OFFERS ===\n";
    csvContent += "Category,Total Offers\n";
    (data.category_wise || []).forEach(row => {
      csvContent += `${row.category},${row.placed_students}\n`;
    });
    csvContent += "\n";

    // 5. Offer Type
    csvContent += "=== OFFER TYPE BREAKDOWN ===\n";
    csvContent += "Offer Type,Total Offers\n";
    (data.offer_type_wise || []).forEach(row => {
      csvContent += `${row.offer_type},${row.placed_students}\n`;
    });
    csvContent += "\n";

    // 6. Salary Wise
    csvContent += "=== SALARY BRACKET BREAKDOWN ===\n";
    csvContent += "Bracket,Total Offers\n";
    (data.salary_wise || []).forEach(row => {
      csvContent += `${row.bracket},${row.placed_students}\n`;
    });
    csvContent += "\n";

    // 7. Top Recruiters
    csvContent += "=== TOP RECRUITERS ===\n";
    csvContent += "Company Name,Total Offers\n";
    (data.top_recruiters || []).forEach(row => {
      csvContent += `${row.company_name},${row.placed_students}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `placement_comprehensive_analytics_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV downloaded successfully");
  };

  const downloadPDF = async () => {
    const input = document.getElementById('analytics-content');
    if (!input) return;

    toast.info("Generating PDF, please wait...");
    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`placement_analytics_${timeframe}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF", error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 py-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#002147] flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-[#002147]" />
            Comprehensive Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Deep dive into placement metrics, trends, and demographics.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 shadow-sm text-gray-700 w-full sm:w-auto">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Export CSV
          </Button>
          <Button onClick={downloadPDF} className="bg-[#002147] shadow-md hover:bg-[#003366] flex items-center gap-2 text-white w-full sm:w-auto">
            <FileText className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {loading ? (
          <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#002147]"></div>
          </div>
      ) : !data ? (
          <div className="p-6 text-center text-gray-500">No data available</div>
      ) : (
      <div id="analytics-content" className="space-y-6">

        {/* Timeframe Filter - above KPI cards */}
        <div className="flex items-center gap-2">
          <div className="w-48">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="bg-white border-[#002147]/20">
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="weekly">This Week (Last 7 Days)</SelectItem>
                <SelectItem value="monthly">This Month (Last 30 Days)</SelectItem>
                <SelectItem value="quarterly">This Quarter (Last 3 Months)</SelectItem>
                <SelectItem value="half_yearly">Half Yearly (Last 6 Months)</SelectItem>
                <SelectItem value="annual">Annual (Last 1 Year)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* KPI Cards for the Latest Batch */}
        {data.year_wise && data.year_wise.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border border-[#002147]/10 bg-white hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#002147]/5 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-[#002147]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Latest Batch</p>
                    <h3 className="text-2xl font-bold text-[#002147]">{data.year_wise[data.year_wise.length - 1].batch_year}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[#002147]/10 bg-white hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#002147]/5 rounded-lg">
                    <Users className="h-5 w-5 text-[#002147]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Interested</p>
                    <h3 className="text-2xl font-bold text-[#002147]">{data.year_wise[data.year_wise.length - 1].interested_students}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[#002147]/10 bg-white hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#002147]/5 rounded-lg">
                    <Briefcase className="h-5 w-5 text-[#002147]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Placed</p>
                    <h3 className="text-2xl font-bold text-[#002147]">{data.year_wise[data.year_wise.length - 1].placed_students}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[#002147]/10 bg-white hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#002147]/5 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-[#002147]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</p>
                    <h3 className="text-2xl font-bold text-[#002147]">
                      {data.year_wise[data.year_wise.length - 1].placement_percentage?.toFixed(1) || 0}%
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Primary Row: Year Trends & Top Recruiters */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-sm border-0">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2">Overall Placement Trends</CardTitle>
              <CardDescription>Participation vs Placement across years</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.year_wise} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="batch_year" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" layout="vertical" verticalAlign="top" align="right" wrapperStyle={{ paddingLeft: '20px' }} />
                    <Bar dataKey="interested_students" name="Interested" fill="#85c1e9" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="placed_students" name="Placed" fill="#002147" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2"><Award className="w-5 h-5 text-amber-500"/> Top Recruiters</CardTitle>
              <CardDescription>Companies generating the most offers</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_recruiters} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="company_name" type="category" axisLine={false} tickLine={false} width={100} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="placed_students" name="Total Offers" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                      {data.top_recruiters && data.top_recruiters.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Row: Department & Salary Brackets */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-sm border-0">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500"/> Department Performance</CardTitle>
              <CardDescription>Total placed students grouped by department</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.department_wise} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="department_code" type="category" axisLine={false} tickLine={false} width={80} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="placed_students" name="Placed Students" radius={[0, 4, 4, 0]} barSize={24}>
                      {data.department_wise && data.department_wise.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
              <CardHeader className="border-b bg-gray-50/50 rounded-t-xl pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500"/> Salary Brackets</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center items-center">
              <div className="h-[250px] w-full scale-110">
                  {data.salary_wise && data.salary_wise.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                      data={data.salary_wise}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="placed_students"
                      nameKey="bracket"
                      >
                      {data.salary_wise.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SALARY_COLORS[index % SALARY_COLORS.length]} />
                      ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </PieChart>
                  </ResponsiveContainer>
                  ) : <div className="text-muted-foreground text-center flex items-center justify-center h-full">No placement data available for this timeframe</div>}
              </div>
              </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
              <CardHeader className="border-b bg-gray-50/50 rounded-t-xl pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><UserCircle className="w-5 h-5 text-rose-500"/> Gender Split</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center items-center">
              <div className="h-[250px] w-full scale-110">
                  {data.gender_wise && data.gender_wise.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                      data={data.gender_wise}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={75}
                      dataKey="placed_students"
                      nameKey="gender"
                      >
                      {data.gender_wise.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.gender === 'Female' ? '#ec4899' : entry.gender === 'Male' ? '#3b82f6' : '#94a3b8'} />
                      ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </PieChart>
                  </ResponsiveContainer>
                  ) : <div className="text-muted-foreground text-center flex items-center justify-center h-full">No placement data available for this timeframe</div>}
              </div>
              </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden w-full">
            <div className="border-b bg-[#f8fafc] p-6 text-[#002147]">
                <h3 className="text-xl font-bold">Master Analytical Summary</h3>
                <p className="text-sm text-muted-foreground mt-1">Numerical breakdown across all analytical timeframes</p>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#f8fafc] text-[#002147] font-semibold border-b">
                <tr>
                    <th className="py-4 px-6 font-semibold text-gray-700">Batch Year</th>
                    <th className="py-4 px-6 font-semibold text-gray-700">Total Students</th>
                    <th className="py-4 px-6 font-semibold text-gray-700">Interested</th>
                    <th className="py-4 px-6 font-semibold text-gray-700">Placed</th>
                    <th className="py-4 px-6 font-semibold text-gray-700">Placement %</th>
                    <th className="py-4 px-6 font-semibold text-gray-700">Total Offers</th>
                </tr>
                </thead>
                <tbody className="divide-y">
                {data.year_wise && data.year_wise.map((row) => (
                    <tr key={row.batch_year} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#002147]">{row.batch_year}</td>
                    <td className="py-4 px-6">{row.total_students}</td>
                    <td className="py-4 px-6">{row.interested_students}</td>
                    <td className="py-4 px-6 font-medium">{row.placed_students}</td>
                    <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        (row.placement_percentage || 0) > 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {(row.placement_percentage || 0).toFixed(1)}%
                        </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-blue-600">{row.total_offers}</td>
                    </tr>
                ))}
                {(!data.year_wise || data.year_wise.length === 0) && (
                    <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                        No placement data available for this timeframe.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      </div>
      )}
    </div>
  );
}
