'use client';
import Link from 'next/link';
import {
  Building2,
  Users,
  Briefcase,
  Calendar as CalendarIcon,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const quickLinks = [
    {
      title: 'Company Details',
      description: 'Manage companies, eligibility criteria, and incharge details.',
      icon: Building2,
      href: '/dashboard/companies',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Placement Drives',
      description: 'Create and monitor ongoing recruitment drives.',
      icon: Briefcase,
      href: '/dashboard/drives',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Student Database',
      description: 'View and manage student profiles and placements.',
      icon: Users,
      href: '/dashboard/students',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Calendar',
      description: 'Check upcoming schedules and recruitment dates.',
      icon: CalendarIcon,
      href: '/dashboard/calendar',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#002147]">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back! Manage the placement activities of KEC from here.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Card key={link.href} className="group hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{link.title}</CardTitle>
              <div className={`p-2 rounded-md ${link.bgColor} ${link.color}`}>
                <link.icon size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">{link.description}</CardDescription>
              <Link href={link.href}>
                <Button variant="ghost" className="w-full justify-between text-[#002147] group-hover:bg-[#002147]/5">
                  Get Started
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Featured Section for Company Details as per request */}
      <div className="mt-8">
        <Card className="border-2 border-dashed border-[#002147]/20 bg-[#002147]/[0.02]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-[#002147]">Managed Company Details</CardTitle>
                <CardDescription>View, add, update and delete company recruitment information in a tabular format.</CardDescription>
              </div>
              <Link href="/dashboard/companies">
                <Button className="bg-[#002147] hover:bg-[#003366]">
                  Open Companies Table
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="hidden md:block">
            <div className="relative rounded-md border bg-white p-4 overflow-hidden pointer-events-none opacity-60">
              <div className="flex items-center justify-between p-2 border-b font-semibold text-xs text-gray-400">
                <span>S.no</span>
                <span>Name of the company</span>
                <span>Incharge</span>
                <span>Eligible department</span>
                <span>Salary</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b text-xs text-gray-400">
                <span>1</span>
                <span className="font-medium">Zoho</span>
                <span>MCA, data</span>
                <span>CSE, IT, MCA</span>
                <span className="text-green-600">5LPA</span>
                <span className="flex gap-2"><div className="w-4 h-4 rounded bg-gray-100" /> <div className="w-4 h-4 rounded bg-gray-100" /></span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

