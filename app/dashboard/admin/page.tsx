import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) redirect("/login");

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default-fallback-secret-value");
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== "admin" && payload.role !== "owner") {
      redirect("/dashboard");
    }
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/5 p-12 backdrop-blur-xl">
        <h1 className="text-4xl font-bold text-red-500">Admin Area</h1>
        <p className="mt-4 text-gray-400">Welcome to the secret admin dashboard. Only admins and owners can see this.</p>
        
        <div className="mt-8">
           <p className="text-sm font-medium text-gray-450">Administrative operations would go here...</p>
        </div>
      </div>
    </div>
  );
}
