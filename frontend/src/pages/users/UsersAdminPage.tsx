import { useState, type FormEvent } from "react";
import { useCreateUser, useUpdateUser, useUsers } from "@/api/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/api/client";
import type { Role } from "@/types/models";

export function UsersAdminPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("user");

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createUser.mutate(
      { username, password, displayName, role },
      {
        onSuccess: () => {
          setUsername("");
          setPassword("");
          setDisplayName("");
          setRole("user");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap" onSubmit={handleCreate}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-username">Username</Label>
              <Input id="new-username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-displayname">Display name</Label>
              <Input
                id="new-displayname"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-role">Role</Label>
              <select
                id="new-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {createUser.isError && (
              <p className="w-full text-sm text-destructive">
                {createUser.error instanceof ApiError ? createUser.error.message : "Could not create user"}
              </p>
            )}
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Adding..." : "Add user"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>Deactivate an account instead of deleting it to preserve its history.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {users?.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {user.displayName} <span className="text-muted-foreground">@{user.username}</span>
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role} &middot; {user.isActive ? "active" : "deactivated"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateUser.mutate({ id: user.id, role: user.role === "admin" ? "user" : "admin" })}
                >
                  Make {user.role === "admin" ? "user" : "admin"}
                </Button>
                <Button
                  size="sm"
                  variant={user.isActive ? "destructive" : "outline"}
                  onClick={() => updateUser.mutate({ id: user.id, isActive: !user.isActive })}
                >
                  {user.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
