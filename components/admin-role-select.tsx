'use client';

import { useTransition } from 'react';

export function AdminRoleSelect({
  userId,
  defaultRole,
}: {
  userId: string;
  defaultRole: 'user' | 'admin';
}) {
  const [, startTransition] = useTransition();

  return (
    <form action="/api/admin/set-role" method="post" className="inline-flex">
      <input type="hidden" name="id" value={userId} />
      <select
        name="role"
        defaultValue={defaultRole}
        onChange={(e) => {
          const form = e.currentTarget.form;
          startTransition(() => form?.requestSubmit());
        }}
        className="bg-black border border-bayern-border text-xs px-2 py-1 cursor-pointer"
      >
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
    </form>
  );
}
