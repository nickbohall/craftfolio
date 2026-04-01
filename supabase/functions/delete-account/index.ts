import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT using the user's token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Use service role client for admin operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delete in dependency order: join tables first, then parents

    // 1. Get all project IDs for this user
    const { data: projects } = await adminClient
      .from("projects")
      .select("id")
      .eq("user_id", userId);

    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

    if (projectIds.length > 0) {
      // 2. Delete project_photos for user's projects
      await adminClient
        .from("project_photos")
        .delete()
        .in("project_id", projectIds);

      // 3. Delete project_materials for user's projects
      await adminClient
        .from("project_materials")
        .delete()
        .in("project_id", projectIds);
    }

    // 4. Delete projects
    await adminClient
      .from("projects")
      .delete()
      .eq("user_id", userId);

    // 5. Delete materials
    await adminClient
      .from("materials")
      .delete()
      .eq("user_id", userId);

    // 6. Delete user row
    await adminClient
      .from("users")
      .delete()
      .eq("id", userId);

    // 7. Delete auth user via admin API
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
