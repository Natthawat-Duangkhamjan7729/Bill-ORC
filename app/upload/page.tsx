import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import UploadClient from "./upload-client";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      title="เพิ่มใบเสร็จ"
      subtitle="ถ่ายรูปหรือเลือกได้หลายใบพร้อมกัน"
      email={user.email}
    >
      <UploadClient />
    </AppShell>
  );
}
