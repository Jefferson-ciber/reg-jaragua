import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Método não permitido." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Sessão administrativa necessária." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) return json(500, { error: "Configure SUPABASE_SERVICE_ROLE_KEY nos secrets da função." });

  // Cliente do solicitante: valida o JWT com o Auth, não confia no conteúdo enviado pelo navegador.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json(401, { error: "Sessão inválida ou expirada." });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("member_profiles").select("role,is_active").eq("id", callerData.user.id).maybeSingle();
  if (profileError) return json(500, { error: "Não foi possível verificar as permissões administrativas." });
  if (!profile || profile.role !== "admin" || profile.is_active !== true) {
    return json(403, { error: "Somente administradores ativos podem criar contas." });
  }

  let input: { email?: string; password?: string; display_name?: string };
  try { input = await req.json(); } catch { return json(400, { error: "Corpo da requisição inválido." }); }
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const displayName = String(input.display_name ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Informe um e-mail válido." });
  if (password.length < 12) return json(400, { error: "A senha temporária precisa ter pelo menos 12 caracteres." });
  if (displayName.length < 2 || displayName.length > 100) return json(400, { error: "Informe o nome do integrante (2 a 100 caracteres)." });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, must_change_password: true },
  });
  if (createError || !created.user) {
    return json(400, { error: createError?.message || "Não foi possível criar a conta." });
  }

  const { error: insertError } = await adminClient.from("member_profiles").insert({
    id: created.user.id,
    display_name: displayName,
    role: "member",
    is_active: true,
  });
  if (insertError) {
    // Rollback: não deixa usuário Auth sem perfil ativo quando a criação do perfil falha.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json(500, { error: "A conta não pôde ser concluída; a operação foi revertida." });
  }
  return json(201, { success: true, user_id: created.user.id, email: created.user.email });
});
