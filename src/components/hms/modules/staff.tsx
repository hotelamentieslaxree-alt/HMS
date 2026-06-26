// Staff & Roles module
"use client";

import { useApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, Building2 } from "lucide-react";

const ROLE_LEVELS: Record<number, { label: string; color: string }> = {
  1: { label: "Owner", color: "#7C3AED" },
  2: { label: "General Manager", color: "#1B3A6B" },
  3: { label: "Manager", color: "#0369A1" },
  4: { label: "Staff", color: "#0F766E" },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner / CEO", gm: "General Manager", fom: "Front Office Manager", hk_mgr: "Housekeeping Manager",
  fb_mgr: "F&B Manager", rev_mgr: "Revenue Manager", fin_mgr: "Finance Manager", eng_mgr: "Engineering Manager",
  hr_mgr: "HR Manager", receptionist: "Receptionist", hk_attendant: "Housekeeping Attendant",
  waiter: "Waiter / Server", technician: "Maintenance Technician",
};

export function StaffModule() {
  const { data, loading } = useApi<any[]>("/api/staff", []);

  if (loading || !data) return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  const byLevel = [1, 2, 3, 4].map((lvl) => ({ lvl, staff: data.filter((s) => s.roleLevel === lvl) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {byLevel.map(({ lvl, staff }) => (
          <Card key={lvl}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ROLE_LEVELS[lvl].label}</p>
                <p className="font-display text-2xl font-bold">{staff.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: ROLE_LEVELS[lvl].color + "20" }}>
                <Building2 className="h-5 w-5" style={{ color: ROLE_LEVELS[lvl].color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {byLevel.map(({ lvl, staff }) => staff.length > 0 && (
        <div key={lvl}>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ROLE_LEVELS[lvl].color }} />
            <h3 className="font-display text-sm font-semibold">{ROLE_LEVELS[lvl].label}s</h3>
            <Badge variant="secondary" className="text-[10px]">{staff.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {staff.map((s: any) => (
              <Card key={s.id} className="hover:shadow-card-lg transition-shadow" style={{ borderLeft: `3px solid ${ROLE_LEVELS[s.roleLevel].color}` }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: ROLE_LEVELS[s.roleLevel].color }}>
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{s.fullName}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {s.department && <Badge variant="outline" className="text-[9px]">{s.department}</Badge>}
                        <Badge variant="secondary" className="text-[9px] font-mono-num">{s.employeeCode}</Badge>
                        {s.isActive ? <Badge className="text-[9px] bg-[#16A34A]">Active</Badge> : <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{s.email}</p>
                    {s.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{s.phone}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
