import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  IconCamera,
  IconChart,
  IconTag,
  IconSheet,
  IconShield,
  IconTrend,
  IconArrowRight,
  IconCheck,
  IconSparkle,
} from "@/components/icons";
import { AppMark } from "@/components/brand";
import HeroPreview from "@/components/hero-preview";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: IconCamera,
    title: "สแกนทีละหลายใบ",
    body: "เลือกรูปพร้อมกันได้ทั้งกอง AI อ่านทีละใบเป็นคิว ใบแรกเสร็จก็ตรวจได้เลยไม่ต้องรอครบ ใบไหนอ่านไม่ออกก็ข้ามหรือกรอกเองได้ ไม่ล้มทั้งชุด",
  },
  {
    icon: IconTrend,
    title: "รู้กำไรทุกสิ้นเดือน",
    body: "บันทึกยอดขายประจำวันคู่กับใบเสร็จ แล้วระบบหักลบให้เอง เห็นกราฟรายรับเทียบรายจ่ายย้อนหลัง 12 เดือนในหน้าเดียว",
  },
  {
    icon: IconTag,
    title: "แยกหมวดให้อัตโนมัติ",
    body: "AI เดาให้ว่าบิลใบนี้คือวัตถุดิบ ค่าน้ำค่าไฟ อุปกรณ์ ค่าขนส่ง หรือค่าเช่า แก้เองได้ก่อนบันทึก แล้วเอาไปดูว่าต้นทุนรั่วตรงไหน",
  },
  {
    icon: IconChart,
    title: "เห็นว่าเงินไปไหน",
    body: "อันดับร้านที่จ่ายมากที่สุด สัดส่วนรายจ่ายต่อหมวด และยอดรวมรายเดือน ช่วยให้ตัดสินใจเรื่องต้นทุนจากตัวเลขจริง ไม่ใช่ความรู้สึก",
  },
  {
    icon: IconSheet,
    title: "ส่งต่อให้บัญชีได้ทันที",
    body: "ดาวน์โหลดเป็น CSV ได้ทั้งแบบรายใบและรายสินค้า หัวคอลัมน์ภาษาไทย เปิดใน Excel ไม่เพี้ยน และตรงกับช่วงวันที่ที่กรองไว้",
  },
  {
    icon: IconShield,
    title: "ข้อมูลเป็นของคุณคนเดียว",
    body: "ฐานข้อมูลบังคับสิทธิ์ในระดับแถว บัญชีอื่นดึงข้อมูลคุณไม่ได้แม้โค้ดจะพลาด รูปใบเสร็จเก็บแบบปิด เปิดดูได้ผ่านลิงก์ที่หมดอายุเท่านั้น",
  },
];

const STEPS = [
  {
    n: "01",
    title: "ถ่ายรูปใบเสร็จ",
    body: "ถ่ายสดหรือเลือกจากคลังภาพ รูปใหญ่ถูกย่อให้อัตโนมัติก่อนส่ง",
  },
  {
    n: "02",
    title: "ตรวจสิ่งที่ AI อ่านมา",
    body: "ชื่อร้าน วันที่ รายการ ยอดเงิน ขึ้นมาให้ครบ แก้ตรงไหนก็ได้ก่อนกดบันทึก",
  },
  {
    n: "03",
    title: "ดูกำไรของเดือนนี้",
    body: "ตัวเลขเข้าหน้าภาพรวมทันที พร้อมกราฟและไฟล์ส่งออกเมื่อต้องใช้",
  },
];

export default async function LandingPage() {
  // Signed-in visitors go straight to their dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-surface">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/85 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <AppMark />
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#features" className="btn-ghost">
              ฟีเจอร์
            </a>
            <a href="#how" className="btn-ghost">
              วิธีใช้
            </a>
            <a href="#security" className="btn-ghost">
              ความปลอดภัย
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">
              เข้าสู่ระบบ
            </Link>
            <Link href="/login?mode=signup" className="btn-primary">
              เริ่มใช้ฟรี
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden bg-surface-dark text-white">
          {/* Soft brand glow, purely decorative. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-600/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-56 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand-300/10 blur-3xl"
          />

          <div className="shell relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-section-lg">
            <div>
              <p className="inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3 py-1.5 text-caption font-medium text-brand-300">
                <IconSparkle className="h-4 w-4" />
                อ่านใบเสร็จด้วย AI — รองรับภาษาไทย
              </p>

              <h1 className="mt-6 text-balance text-h1 font-bold text-white sm:text-display">
                ถ่ายรูปใบเสร็จ
                <br />
                แล้วให้ AI จดบัญชีให้
              </h1>

              <p className="mt-5 max-w-prose text-lead text-ondark">
                จดบิลอ่านชื่อร้าน วันที่ รายการสินค้า และยอดเงินจากรูปใบเสร็จให้อัตโนมัติ
                บันทึกยอดขายควบคู่ แล้วบอกทันทีว่าเดือนนี้ร้านของคุณกำไรหรือขาดทุน
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login?mode=signup" className="btn-primary px-7 py-3.5">
                  เริ่มใช้ฟรี
                  <IconArrowRight className="h-4 w-4" />
                </Link>
                <a href="#how" className="btn-on-dark px-7 py-3.5">
                  ดูวิธีใช้งาน
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-small text-ondark-muted">
                {[
                  "ใช้ได้ทั้งบิลไทยและอังกฤษ",
                  "ติดตั้งบนมือถือได้",
                  "ส่งออก Excel ได้",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <IconCheck className="h-4 w-4 shrink-0 text-brand-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* --------------------------------------------------------- problem */}
        <section className="border-b border-line bg-surface-raised">
          <div className="shell py-14 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <p className="eyebrow">ปัญหาที่เจอทุกเดือน</p>
                <h2 className="mt-3 text-balance text-h3 font-bold text-ink-900 sm:text-h2">
                  บิลกองเต็มลิ้นชัก
                  <br />
                  แต่ยังไม่รู้ว่าเดือนนี้เหลือเท่าไหร่
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  {
                    t: "พิมพ์เองทีละบรรทัด",
                    d: "บิลใบเดียวมี 30 รายการ กว่าจะคีย์ครบก็หมดเวลาปิดร้าน",
                  },
                  {
                    t: "ตัวเลขไม่ครบ",
                    d: "บางใบหาย บางใบจำไม่ได้ว่าซื้ออะไร สรุปยอดจึงไม่เคยตรง",
                  },
                  {
                    t: "รู้กำไรช้าเกินไป",
                    d: "กว่าจะรู้ว่าต้นทุนบานก็ผ่านไปหลายเดือนแล้ว",
                  },
                ].map((item) => (
                  <div key={item.t} className="border-t-2 border-line pt-4">
                    <h3 className="text-h4 font-semibold text-ink-900">{item.t}</h3>
                    <p className="mt-2 text-small text-ink-600">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- features */}
        <section id="features" className="scroll-mt-20 py-section">
          <div className="shell">
            <div className="max-w-prose">
              <p className="eyebrow">ความสามารถ</p>
              <h2 className="mt-3 text-balance text-h3 font-bold text-ink-900 sm:text-h2">
                ครบตั้งแต่ถ่ายบิล จนถึงส่งให้บัญชี
              </h2>
              <p className="mt-4 text-lead text-ink-600">
                ออกแบบจากงานจริงของร้านเล็ก ไม่ใช่ระบบบัญชีองค์กรที่ใช้ยาก
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="card p-6 transition hover:border-line-strong hover:shadow-card"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-h4 font-semibold text-ink-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-small text-ink-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- how */}
        <section
          id="how"
          className="scroll-mt-20 border-y border-line bg-surface-raised py-section"
        >
          <div className="shell">
            <div className="max-w-prose">
              <p className="eyebrow">วิธีใช้</p>
              <h2 className="mt-3 text-h3 font-bold text-ink-900 sm:text-h2">
                สามขั้นตอน จบในไม่กี่นาที
              </h2>
            </div>

            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((step) => (
                <li key={step.n} className="relative">
                  <span className="text-h3 font-bold tabular-nums text-brand-600">
                    {step.n}
                  </span>
                  <h3 className="mt-2 text-h4 font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-small text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------------------------------- security */}
        <section id="security" className="scroll-mt-20 py-section">
          <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow">ความปลอดภัย</p>
              <h2 className="mt-3 text-balance text-h3 font-bold text-ink-900 sm:text-h2">
                ข้อมูลร้านเป็นเรื่องส่วนตัว
              </h2>
              <p className="mt-4 text-body text-ink-600">
                ยอดขายและต้นทุนคือความลับทางธุรกิจ ระบบจึงถูกวางให้ปิดไว้ก่อนเป็นค่าเริ่มต้น
                ไม่ใช่เปิดแล้วค่อยมาตามปิดทีหลัง
              </p>
              <Link
                href="/login?mode=signup"
                className="btn-primary mt-7 px-7 py-3.5"
              >
                สร้างบัญชีร้านของคุณ
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ul className="grid gap-3">
              {[
                {
                  t: "บัญชีอื่นเห็นข้อมูลคุณไม่ได้",
                  d: "ฐานข้อมูลบังคับสิทธิ์ระดับแถว ต่อให้โค้ดหน้าเว็บพลาด ฐานข้อมูลก็ยังปฏิเสธการดึงข้อมูลข้ามบัญชี",
                },
                {
                  t: "รูปใบเสร็จไม่มีลิงก์สาธารณะ",
                  d: "เก็บในพื้นที่ปิด แยกโฟลเดอร์ตามบัญชี เปิดดูผ่านลิงก์ชั่วคราวที่หมดอายุใน 1 ชั่วโมง",
                },
                {
                  t: "มีเพดานการใช้งานกันการถูกสวมสิทธิ์",
                  d: "จำกัดขนาดและชนิดไฟล์ พร้อมเพดานจำนวนใบต่อวันต่อบัญชี",
                },
              ].map((item) => (
                <li key={item.t} className="card flex gap-4 p-5">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <IconCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-body font-semibold text-ink-900">
                      {item.t}
                    </h3>
                    <p className="mt-1 text-small text-ink-600">{item.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- final CTA */}
        <section className="pb-section">
          <div className="shell">
            <div className="relative overflow-hidden rounded-card bg-surface-dark px-6 py-14 text-center sm:px-12 sm:py-16">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl"
              />
              <div className="relative">
                <h2 className="text-balance text-h3 font-bold text-white sm:text-h2">
                  เริ่มจดบิลใบแรกวันนี้
                </h2>
                <p className="mx-auto mt-4 max-w-prose text-body text-ondark">
                  ไม่ต้องติดตั้งโปรแกรม เปิดจากมือถือได้ทันที
                  และเพิ่มไว้ที่หน้าจอโฮมให้ใช้เหมือนแอปจริงได้
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/login?mode=signup" className="btn-primary px-7 py-3.5">
                    เริ่มใช้ฟรี
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/login" className="btn-on-dark px-7 py-3.5">
                    มีบัญชีแล้ว เข้าสู่ระบบ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-line bg-surface-raised">
        <div className="shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <AppMark />
          <p className="text-caption text-ink-450">
            จดบิล — ผู้ช่วยบัญชีร้านค้าขนาดเล็ก
          </p>
        </div>
      </footer>
    </div>
  );
}
