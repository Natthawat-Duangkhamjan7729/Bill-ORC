import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "📷",
    title: "สแกนใบเสร็จ",
    body: "ถ่ายรูปใบเสร็จ AI อ่านชื่อร้าน วันที่ รายการสินค้า และยอดรวมให้อัตโนมัติ — ทีละหลายใบก็ได้",
  },
  {
    icon: "💰",
    title: "บันทึกยอดขาย",
    body: "จดรายรับประจำวันแยกตามช่องทาง เงินสด โอน หรือเดลิเวอรี่",
  },
  {
    icon: "📈",
    title: "เห็นกำไร-ขาดทุน",
    body: "รายรับหักรายจ่ายรายเดือน พร้อมกราฟเปรียบเทียบและแยกตามหมวดหมู่",
  },
  {
    icon: "⬇️",
    title: "ส่งออก Excel",
    body: "ดาวน์โหลดเป็นไฟล์ CSV ส่งให้บัญชีหรือใช้ทำภาษีได้ทันที",
  },
];

export default async function Home() {
  // Signed-in visitors go straight to their dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-3xl">
          🧾
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Bill ORC
        </h1>
        <p className="max-w-md text-gray-500">
          บันทึกใบเสร็จและยอดขายของร้าน ให้ AI อ่านข้อมูลจากรูปให้อัตโนมัติ
          แล้วดูว่าเดือนนี้กำไรหรือขาดทุน
        </p>
      </div>

      <ul className="grid w-full gap-3 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4"
          >
            <span aria-hidden className="text-xl">
              {feature.icon}
            </span>
            <div>
              <p className="font-medium text-gray-900">{feature.title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{feature.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/login"
        className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white transition hover:bg-teal-700"
      >
        เข้าสู่ระบบ / สมัครใช้งาน
      </Link>
    </main>
  );
}
