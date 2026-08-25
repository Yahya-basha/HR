import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, Download, Printer, FileSpreadsheet, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

export default function Payroll() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState('2026-08');

  useEffect(() => {
    base44.entities.Employee.list().then(setEmployees).catch(() => {});
  }, []);

  const totalBasic = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
  const totalAllowances = employees.reduce((sum, e) => sum + (Number(e.housing_allowance) || 0) + (Number(e.transport_allowance) || 0), 0);
  
  // Calculate GOSI (9.75% for Saudis, 2% for Non-Saudis)
  const calculateGOSI = (emp) => {
    const isSaudi = (emp.nationality || '').includes('سعودي');
    const base = Number(emp.salary) || 0;
    return isSaudi ? Math.round(base * 0.0975) : Math.round(base * 0.02);
  };

  const totalGOSI = employees.reduce((sum, e) => sum + calculateGOSI(e), 0);
  const totalNet = totalBasic + totalAllowances - totalGOSI;

  // Export WPS File (CSV compatible with Mudad / Saudi Banks)
  const handleExportWPS = () => {
    const headers = 'Employee_ID,Employee_Name,National_ID,Basic_Salary,Housing_Allowance,Transport_Allowance,GOSI_Deduction,Net_Salary,Bank_IBAN';
    const rows = employees.map(e => {
      const gosi = calculateGOSI(e);
      const net = (Number(e.salary) || 0) + (Number(e.housing_allowance) || 0) + (Number(e.transport_allowance) || 0) - gosi;
      return `"${e.employee_number}","${e.full_name}","${e.national_id || ''}",${e.salary},${e.housing_allowance || 0},${e.transport_allowance || 0},${gosi},${net},"SA0000000000000000000000"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WPS_Mudad_Payroll_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'تم تصدير ملف حماية الأجور (WPS / منصة مدد) بنجاح 📑' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">مسير الرواتب وحماية الأجور (WPS)</h1>
            <p className="text-xs text-muted-foreground mt-0.5">احتساب الرواتب والبدلات واستقطاعات التأمينات الاجتماعية (GOSI) وتصدير منصة مدد</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportWPS} className="bg-[#1E1035] hover:bg-[#2D164D] text-white font-bold text-xs rounded-xl shadow-sm gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#C5A869]" /> تصدير ملف حماية الأجور (مدد / WPS)
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="text-xs rounded-xl gap-2">
            <Printer className="w-4 h-4" /> طباعة المسير
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white space-y-1">
          <span className="text-xs text-muted-foreground">إجمالي الرواتب الأساسية</span>
          <p className="text-2xl font-bold font-mono text-foreground">{totalBasic.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
        </Card>

        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white space-y-1">
          <span className="text-xs text-muted-foreground">إجمالي البدلات المعتمدة</span>
          <p className="text-2xl font-bold font-mono text-foreground">{totalAllowances.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
        </Card>

        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-white space-y-1">
          <span className="text-xs text-muted-foreground">اشتراكات التأمينات (GOSI)</span>
          <p className="text-2xl font-bold font-mono text-red-600">{totalGOSI.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
        </Card>

        <Card className="p-5 border-border/60 shadow-sm rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
          <span className="text-xs text-primary font-bold">صافي مسير الرواتب المستحق</span>
          <p className="text-2xl font-bold font-mono text-primary">{totalNet.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
        </Card>
      </div>

      {/* Detailed Payroll Table */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="font-bold text-xs">الموظف</TableHead>
              <TableHead className="font-bold text-xs">الجنسية</TableHead>
              <TableHead className="font-bold text-xs">الراتب الأساسي</TableHead>
              <TableHead className="font-bold text-xs">بدل سكن</TableHead>
              <TableHead className="font-bold text-xs">بدل مواصلات</TableHead>
              <TableHead className="font-bold text-xs">التأمينات (GOSI)</TableHead>
              <TableHead className="font-bold text-xs">صافي الراتب</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => {
              const gosi = calculateGOSI(emp);
              const net = (Number(emp.salary) || 0) + (Number(emp.housing_allowance) || 0) + (Number(emp.transport_allowance) || 0) - gosi;
              return (
                <TableRow key={emp.id} className="hover:bg-secondary/20">
                  <TableCell>
                    <div>
                      <p className="font-bold text-sm text-foreground">{emp.full_name}</p>
                      <span className="font-mono text-xs text-primary">#{emp.employee_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {emp.nationality || 'سعودي'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs">{Number(emp.salary || 0).toLocaleString()} ر.س</TableCell>
                  <TableCell className="font-mono text-xs">{Number(emp.housing_allowance || 0).toLocaleString()} ر.س</TableCell>
                  <TableCell className="font-mono text-xs">{Number(emp.transport_allowance || 0).toLocaleString()} ر.س</TableCell>
                  <TableCell className="font-mono text-xs text-red-600">-{gosi.toLocaleString()} ر.س</TableCell>
                  <TableCell className="font-mono font-bold text-sm text-emerald-700">{net.toLocaleString()} ر.س</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
