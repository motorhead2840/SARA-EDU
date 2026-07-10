export async function mentorLogin(data: any) {
  const res = await fetch('/api/mentor/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function mentorRegister(data: any) {
  const res = await fetch('/api/mentor/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMentorMe(token: string) {
  const res = await fetch('/api/mentor/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function getMentorMetrics(token: string) {
  const res = await fetch('/api/mentor/metrics', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}
