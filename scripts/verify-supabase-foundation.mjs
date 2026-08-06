async function main() {
  const requiredVariables = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

  if (missingVariables.length > 0) {
    console.error(`Supabase 配置缺失：${missingVariables.join(", ")}`);
    return 1;
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();

  try {
    const parsedUrl = new URL(projectUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error("invalid protocol");
  } catch {
    console.error("Supabase URL 格式不正确。");
    return 1;
  }

  async function checkTable(table) {
    const response = await fetch(`${projectUrl}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: publishableKey },
    });
    const body = await response.text();
    return { status: response.status, emptyResult: body.trim() === "[]" };
  }

  try {
    const [profiles, devices] = await Promise.all([checkTable("profiles"), checkTable("devices")]);
    console.log(`Supabase REST reachable; profiles=${profiles.status}, devices=${devices.status}.`);

    const anonymousAccessDenied = [401, 403].includes(profiles.status) && [401, 403].includes(devices.status);
    if (anonymousAccessDenied) {
      console.log("Anonymous RLS smoke check passed: both tables denied unauthenticated access.");
      return 0;
    }

    if (profiles.status === 404 || devices.status === 404) {
      console.error("Supabase reachable, but the foundation migration has not been applied yet.");
    } else {
      console.error("Anonymous RLS smoke check did not reach the expected empty result.");
    }
    return 1;
  } catch {
    console.error("Supabase connection check failed; network or project configuration may be unavailable.");
    return 1;
  }
}

process.exitCode = await main();
