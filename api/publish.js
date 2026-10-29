const REPO_OWNER = "hamzasoltan";
const REPO_NAME = "arakon-cards";
const DATA_PATH = "data.json";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  if (!expectedUser || !expectedPassword || !token) {
    return res.status(500).json({ error: "إعدادات الإدارة أو النشر ناقصة في Vercel" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "صيغة البيانات غير صحيحة" });
    }
    const { username, password } = body;
    if (typeof username !== "string" || typeof password !== "string" || username !== expectedUser || password !== expectedPassword) {
      return res.status(401).json({ error: "بيانات الإدارة غير صحيحة" });
    }
    delete body.username;
    delete body.password;
    const requiredArrays = ["legions", "cards", "members", "tasks", "market", "admins", "logs"];
    for (const key of requiredArrays) {
      if (!Array.isArray(body[key])) return res.status(400).json({ error: `بيانات غير صحيحة: ${key}` });
    }
    if (body.settings !== undefined && (typeof body.settings !== "object" || body.settings === null || Array.isArray(body.settings))) {
      return res.status(400).json({ error: "إعدادات الموقع غير صحيحة" });
    }
    const api = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "arakon-cards-publisher"
    };
    const currentResponse = await fetch(`${api}?ref=main`, { headers });
    if (!currentResponse.ok) throw new Error(`GitHub read failed (${currentResponse.status})`);
    const current = await currentResponse.json();
    const content = Buffer.from(JSON.stringify(body, null, 2), "utf8").toString("base64");
    const updateResponse = await fetch(api, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Publish admin dashboard data", content, sha: current.sha, branch: "main" })
    });
    const result = await updateResponse.json().catch(() => ({}));
    if (!updateResponse.ok) {
      const status = updateResponse.status;
      return res.status(status === 409 || status === 422 ? 409 : 502).json({ error: status === 409 || status === 422 ? "البيانات تغيرت على GitHub؛ حدّث الصفحة ثم أعد المحاولة" : "فشل النشر إلى GitHub" });
    }
    return res.status(200).json({ ok: true, commit: result.commit && result.commit.sha });
  } catch (error) {
    console.error("publish error", error && error.message);
    return res.status(502).json({ error: "تعذر النشر إلى GitHub. تحقق من GITHUB_TOKEN ثم حاول مرة أخرى" });
  }
};
