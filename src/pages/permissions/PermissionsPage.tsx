import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ROLE_DEFINITIONS, type AppRole } from '../../types/auth';
import { ShieldCheck, CheckCircle2, Lock, Crown } from 'lucide-react';

export const PermissionsPage: React.FC = () => {
  const roles: AppRole[] = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'HOUSEKEEPER'];

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Ma trận Phân quyền & Vai trò Hệ thống (RBAC)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống Quản lý Khách sạn phân quyền nghiêm ngặt theo 5 vai trò nghiệp vụ độc lập.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((roleKey) => {
          const info = ROLE_DEFINITIONS[roleKey];
          const isAdmin = roleKey === 'ADMIN';

          return (
            <Card
              key={roleKey}
              className={isAdmin ? 'ring-2 ring-amber-500/40 border-amber-300' : ''}
              title={info.title}
              subtitle={info.description}
              action={
                <div className="flex items-center gap-2">
                  {isAdmin && <Crown size={18} className="text-amber-500" />}
                  <Badge role={roleKey} />
                </div>
              }
            >
              <div className="mt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={16} />
                  Danh sách quyền hạn được cấp:
                </p>

                <ul className="list-none flex flex-col gap-2.5">
                  {info.permissions.map((perm, index) => {
                    const isDenied = perm.startsWith('KHÔNG');
                    return (
                      <li
                        key={index}
                        className={`flex items-start gap-2.5 text-xs p-2.5 rounded-lg border leading-relaxed ${
                          isDenied
                            ? 'text-rose-800 bg-rose-50/70 border-rose-200 border-dashed'
                            : 'text-slate-700 bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        {isDenied ? (
                          <Lock size={15} className="shrink-0 mt-0.5 text-rose-600" />
                        ) : (
                          <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                        )}
                        <span>{perm}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
