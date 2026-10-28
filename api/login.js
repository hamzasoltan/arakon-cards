export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return res.status(500).json({ ok: false, error: 'إعدادات تسجيل الدخول غير مكتملة في Vercel' });
  }
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'بيانات الدخول غير مكتملة' });
  }
  if (username !== expectedUser || password !== expectedPassword) {
    return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة' });
  }
  return res.status(200).json({ ok: true });
}
