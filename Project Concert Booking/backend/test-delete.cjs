const BASE = "http://localhost:4000/api/v1";

async function main() {
  // 1) login admin
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@concerthub.dev", password: "Admin1234" }),
  }).then((r) => r.json());
  const token = login.data.token;
  const headers = { Authorization: `Bearer ${token}` };
  console.log("LOGIN OK");

  // 2) create a draft concert (ที่ 1 ของ venue list)
  const venues = await fetch(`${BASE}/venues`).then((r) => r.json());
  const venueId = venues.data[0]?.id ?? venues.data.venues?.[0]?.id;
  console.log("VENUE:", venueId);

  const createRes = await fetch(`${BASE}/concerts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "ทดสอบลบแบบร่าง",
      description: "คอนเสิร์ตทดสอบระบบลบ",
      dates: ["2027-06-01T12:00:00.000Z"],
      venueId,
      zones: [{ code: "VP", price: 1000, isOnSale: true }],
    }),
  }).then((r) => r.json());

  if (!createRes.success) {
    console.log("CREATE FAILED:", JSON.stringify(createRes).slice(0, 300));
    process.exit(1);
  }
  const draftId = createRes.data.concert.id;
  console.log("DRAFT CREATED:", draftId);

  // 3) ลบแบบร่าง
  const del = await fetch(`${BASE}/concerts/${draftId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const delBody = await del.json();
  console.log("DELETE STATUS:", del.status, "BODY:", JSON.stringify(delBody).slice(0, 300));

  await prismaDisconnect();
  async function prismaDisconnect() {
    // noop
  }
}

main().catch((e) => console.error("ERR:", e.message));
