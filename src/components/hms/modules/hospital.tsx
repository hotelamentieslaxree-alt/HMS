// ARIA HMS — Hospital Module (6 tabs: Patients, Doctors, Appointments, OPD/IPD, Emergency, Lab/Pharmacy)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope, Users, Activity, Heart, Ambulance, FlaskConical,
  Plus, Search, Calendar, Clock, BedDouble, UserCheck, AlertTriangle,
  Pill, Microscope, PhoneCall, TrendingUp, ArrowRight,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_PATIENTS = [
  { id: "PT-1001", name: "Rajesh Sharma", age: 54, gender: "Male", doctor: "Dr. Anil Mehta", ward: "Ward-A", status: "admitted", admitDate: "2025-01-10" },
  { id: "PT-1002", name: "Priya Nair", age: 32, gender: "Female", doctor: "Dr. Sunita Rao", ward: "Ward-B", status: "admitted", admitDate: "2025-01-12" },
  { id: "PT-1003", name: "Arun Kumar", age: 67, gender: "Male", doctor: "Dr. Vikram Singh", ward: "ICU", status: "critical", admitDate: "2025-01-14" },
  { id: "PT-1004", name: "Meera Patel", age: 28, gender: "Female", doctor: "Dr. Kavitha Reddy", ward: "Ward-C", status: "discharge_pending", admitDate: "2025-01-08" },
  { id: "PT-1005", name: "Suresh Menon", age: 45, gender: "Male", doctor: "Dr. Anil Mehta", ward: "Ward-A", status: "admitted", admitDate: "2025-01-15" },
];

const MOCK_DOCTORS = [
  { id: "DR-001", name: "Dr. Anil Mehta", specialty: "Cardiology", availability: "Available", phone: "+91 98765 43210", experience: 18, patients: 12 },
  { id: "DR-002", name: "Dr. Sunita Rao", specialty: "Gynecology", availability: "On Rounds", phone: "+91 98765 43211", experience: 14, patients: 8 },
  { id: "DR-003", name: "Dr. Vikram Singh", specialty: "Neurology", availability: "In Surgery", phone: "+91 98765 43212", experience: 22, patients: 6 },
  { id: "DR-004", name: "Dr. Kavitha Reddy", specialty: "General Medicine", availability: "Available", phone: "+91 98765 43213", experience: 10, patients: 15 },
  { id: "DR-005", name: "Dr. Ramesh Iyer", specialty: "Orthopedics", availability: "Available", phone: "+91 98765 43214", experience: 16, patients: 9 },
  { id: "DR-006", name: "Dr. Fatima Khan", specialty: "Pediatrics", availability: "Off Duty", phone: "+91 98765 43215", experience: 8, patients: 11 },
];

const MOCK_APPOINTMENTS = [
  { id: "APT-201", patient: "Deepa Joshi", doctor: "Dr. Kavitha Reddy", time: "09:00 AM", type: "Consultation", status: "confirmed" },
  { id: "APT-202", patient: "Ravi Prasad", doctor: "Dr. Anil Mehta", time: "09:30 AM", type: "Follow-up", status: "confirmed" },
  { id: "APT-203", patient: "Ananya Das", doctor: "Dr. Sunita Rao", time: "10:00 AM", type: "Check-up", status: "in_progress" },
  { id: "APT-204", patient: "Kiran Rao", doctor: "Dr. Ramesh Iyer", time: "10:30 AM", type: "Consultation", status: "waiting" },
  { id: "APT-205", patient: "Sanjay Gupta", doctor: "Dr. Vikram Singh", time: "11:00 AM", type: "Review", status: "confirmed" },
  { id: "APT-206", patient: "Lakshmi Devi", doctor: "Dr. Fatima Khan", time: "11:30 AM", type: "Vaccination", status: "confirmed" },
  { id: "APT-207", patient: "Manoj Tiwari", doctor: "Dr. Anil Mehta", time: "12:00 PM", type: "ECG Review", status: "waiting" },
];

const MOCK_EMERGENCY = [
  { id: "ER-301", patient: "Unknown Male", age: "~55", complaint: "Chest Pain", triage: "critical", admittedAt: "08:15 AM", bed: "ER-1", doctor: "Dr. Anil Mehta" },
  { id: "ER-302", patient: "Kavita Sharma", age: "34", complaint: "Acute Asthma", triage: "urgent", admittedAt: "09:45 AM", bed: "ER-2", doctor: "Dr. Kavitha Reddy" },
  { id: "ER-303", patient: "Rahul Verma", age: "22", complaint: "Fracture - Right Arm", triage: "moderate", admittedAt: "10:20 AM", bed: "ER-3", doctor: "Dr. Ramesh Iyer" },
];

const MOCK_LAB_ORDERS = [
  { id: "LAB-401", patient: "Rajesh Sharma", test: "CBC + ESR", status: "processing", orderedAt: "08:00 AM" },
  { id: "LAB-402", patient: "Arun Kumar", test: "MRI Brain", status: "pending", orderedAt: "09:30 AM" },
  { id: "LAB-403", patient: "Priya Nair", test: "Thyroid Panel", status: "completed", orderedAt: "07:45 AM" },
  { id: "LAB-404", patient: "Suresh Menon", test: "Lipid Profile", status: "processing", orderedAt: "10:00 AM" },
];

const MOCK_PHARMACY = [
  { name: "Amoxicillin 500mg", stock: 2450, reorder: 500, unit: "Tabs", status: "in_stock" },
  { name: "Paracetamol 500mg", stock: 8200, reorder: 1000, unit: "Tabs", status: "in_stock" },
  { name: "Insulin Glargine", stock: 48, reorder: 50, unit: "Vials", status: "low_stock" },
  { name: "Omeprazole 20mg", stock: 120, reorder: 200, unit: "Caps", status: "low_stock" },
  { name: "Aspirin 75mg", stock: 5600, reorder: 500, unit: "Tabs", status: "in_stock" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const PATIENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  admitted: { label: "Admitted", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  critical: { label: "Critical", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  discharge_pending: { label: "Discharge Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  discharged: { label: "Discharged", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
};

const AVAILABILITY_META: Record<string, { label: string; cls: string }> = {
  Available: { label: "Available", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  "On Rounds": { label: "On Rounds", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  "In Surgery": { label: "In Surgery", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  "Off Duty": { label: "Off Duty", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

const TRIAGE_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  urgent: { label: "Urgent", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  moderate: { label: "Moderate", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  minor: { label: "Minor", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
};

const APPT_STATUS_META: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  in_progress: { label: "In Progress", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  waiting: { label: "Waiting", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  cancelled: { label: "Cancelled", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function HospitalModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("patients");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-navy" /> Hospital Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Patient care, doctors, appointments & emergency services</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search patients, doctors..." className="pl-8 h-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button className="bg-navy hover:bg-navy-light text-white"><Plus className="h-4 w-4 mr-1" /> New Patient</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Patients" value={48} icon={Users} accent="navy" delta={5} deltaLabel="vs last week" />
        <KpiCard label="IPD Beds Occupied" value="32/60" icon={BedDouble} accent="info" />
        <KpiCard label="Doctors on Duty" value={4} icon={UserCheck} accent="success" />
        <KpiCard label="OPD Today" value={27} icon={Activity} accent="gold" delta={12} deltaLabel="vs yesterday" />
        <KpiCard label="Emergency" value={3} icon={Ambulance} accent="error" />
        <KpiCard label="Lab Pending" value={2} icon={FlaskConical} accent="warning" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="patients" className="text-xs">Patients</TabsTrigger>
          <TabsTrigger value="doctors" className="text-xs">Doctors</TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs">Appointments</TabsTrigger>
          <TabsTrigger value="opd-ipd" className="text-xs">OPD / IPD</TabsTrigger>
          <TabsTrigger value="emergency" className="text-xs">Emergency</TabsTrigger>
          <TabsTrigger value="lab-pharmacy" className="text-xs">Lab & Pharmacy</TabsTrigger>
        </TabsList>

        {/* ── Patients Tab ── */}
        <TabsContent value="patients" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-navy" /> Admitted Patients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Name</TableHead>
                    <TableHead className="text-[11px]">Age</TableHead>
                    <TableHead className="text-[11px]">Gender</TableHead>
                    <TableHead className="text-[11px]">Doctor</TableHead>
                    <TableHead className="text-[11px]">Ward</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Admit Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PATIENTS.map((p) => {
                    const st = PATIENT_STATUS_META[p.status] ?? PATIENT_STATUS_META.admitted;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.id}</TableCell>
                        <TableCell className="text-xs font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs">{p.age}</TableCell>
                        <TableCell className="text-xs">{p.gender}</TableCell>
                        <TableCell className="text-xs">{p.doctor}</TableCell>
                        <TableCell className="text-xs">{p.ward}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs">{fmtDate(p.admitDate)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Doctors Tab ── */}
        <TabsContent value="doctors" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_DOCTORS.map((d) => {
              const avail = AVAILABILITY_META[d.availability] ?? AVAILABILITY_META.Available;
              return (
                <Card key={d.id} className="hover:shadow-card-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/10 text-navy font-bold text-sm shrink-0">
                        {d.name.split(" ").slice(1, 3).map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialty}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", avail.cls)}>{avail.label}</span>
                          <span className="text-[10px] text-muted-foreground">{d.experience} yrs exp</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {d.patients} patients</span>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><PhoneCall className="h-3 w-3 mr-1" /> Call</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Appointments Tab ── */}
        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-navy" /> Today&apos;s Appointments
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> New Appointment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Time</TableHead>
                    <TableHead className="text-[11px]">Patient</TableHead>
                    <TableHead className="text-[11px]">Doctor</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_APPOINTMENTS.map((a) => {
                    const st = APPT_STATUS_META[a.status] ?? APPT_STATUS_META.confirmed;
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{a.id}</TableCell>
                        <TableCell className="text-xs font-medium flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{a.time}</TableCell>
                        <TableCell className="text-xs">{a.patient}</TableCell>
                        <TableCell className="text-xs">{a.doctor}</TableCell>
                        <TableCell className="text-xs">{a.type}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── OPD/IPD Tab ── */}
        <TabsContent value="opd-ipd" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0369A1]" /> OPD Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Today&apos;s OPD</p>
                    <p className="text-xl font-bold font-display mt-1">27</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Avg Wait Time</p>
                    <p className="text-xl font-bold font-display mt-1">18<span className="text-sm text-muted-foreground ml-1">min</span></p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Consultations Done</p>
                    <p className="text-xl font-bold font-display mt-1">19</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Referrals</p>
                    <p className="text-xl font-bold font-display mt-1">4</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Department-wise OPD</p>
                  {[
                    { dept: "General Medicine", count: 10, pct: 37 },
                    { dept: "Cardiology", count: 6, pct: 22 },
                    { dept: "Gynecology", count: 5, pct: 19 },
                    { dept: "Orthopedics", count: 4, pct: 15 },
                    { dept: "Pediatrics", count: 2, pct: 7 },
                  ].map((d) => (
                    <div key={d.dept} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] w-32 truncate">{d.dept}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5"><div className="bg-navy rounded-full h-1.5" style={{ width: `${d.pct}%` }} /></div>
                      <span className="text-[10px] text-muted-foreground w-6 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-[#16A34A]" /> IPD Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Total Beds</p>
                    <p className="text-xl font-bold font-display mt-1">60</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Occupied</p>
                    <p className="text-xl font-bold font-display mt-1 text-[#D97706]">32</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Available</p>
                    <p className="text-xl font-bold font-display mt-1 text-[#16A34A]">28</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Avg Stay</p>
                    <p className="text-xl font-bold font-display mt-1">3.2<span className="text-sm text-muted-foreground ml-1">days</span></p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ward Occupancy</p>
                  {[
                    { ward: "Ward-A", occ: 12, total: 20 },
                    { ward: "Ward-B", occ: 8, total: 15 },
                    { ward: "Ward-C", occ: 6, total: 10 },
                    { ward: "ICU", occ: 4, total: 8 },
                    { ward: "NICU", occ: 2, total: 7 },
                  ].map((w) => (
                    <div key={w.ward} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] w-12">{w.ward}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5"><div className={cn("rounded-full h-1.5", w.occ / w.total > 0.8 ? "bg-[#DC2626]" : "bg-[#16A34A]")} style={{ width: `${(w.occ / w.total) * 100}%` }} /></div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">{w.occ}/{w.total}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Emergency Tab ── */}
        <TabsContent value="emergency" className="mt-4">
          <Card className="border-[#DC2626]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" /> Active Emergency Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Patient</TableHead>
                    <TableHead className="text-[11px]">Complaint</TableHead>
                    <TableHead className="text-[11px]">Triage</TableHead>
                    <TableHead className="text-[11px]">Bed</TableHead>
                    <TableHead className="text-[11px]">Doctor</TableHead>
                    <TableHead className="text-[11px]">Time</TableHead>
                    <TableHead className="text-[11px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_EMERGENCY.map((e) => {
                    const tri = TRIAGE_META[e.triage] ?? TRIAGE_META.moderate;
                    return (
                      <TableRow key={e.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-mono text-muted-foreground">{e.id}</TableCell>
                        <TableCell className="text-xs font-medium">{e.patient}</TableCell>
                        <TableCell className="text-xs">{e.complaint}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", tri.cls)}>{tri.label}</span></TableCell>
                        <TableCell className="text-xs">{e.bed}</TableCell>
                        <TableCell className="text-xs">{e.doctor}</TableCell>
                        <TableCell className="text-xs">{e.admittedAt}</TableCell>
                        <TableCell><Button variant="outline" size="sm" className="h-6 text-[10px] px-2"><ArrowRight className="h-3 w-3 mr-1" />Admit</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lab & Pharmacy Tab ── */}
        <TabsContent value="lab-pharmacy" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Microscope className="h-4 w-4 text-[#7C3AED]" /> Lab Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">ID</TableHead>
                      <TableHead className="text-[11px]">Patient</TableHead>
                      <TableHead className="text-[11px]">Test</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_LAB_ORDERS.map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-mono text-muted-foreground">{l.id}</TableCell>
                        <TableCell className="text-xs">{l.patient}</TableCell>
                        <TableCell className="text-xs">{l.test}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "completed" ? "default" : l.status === "processing" ? "secondary" : "outline"} className="text-[10px] capitalize">
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{l.orderedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Pill className="h-4 w-4 text-[#16A34A]" /> Pharmacy Stock
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Medicine</TableHead>
                      <TableHead className="text-[11px]">Stock</TableHead>
                      <TableHead className="text-[11px]">Reorder</TableHead>
                      <TableHead className="text-[11px]">Unit</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_PHARMACY.map((p, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs">{p.stock.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.reorder.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{p.unit}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "in_stock" ? "default" : "destructive"} className="text-[10px]">
                            {p.status === "in_stock" ? "In Stock" : "Low Stock"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
