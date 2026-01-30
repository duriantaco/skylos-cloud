// import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
//   throw new Error("Missing Supabase environment variables");
// }

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// function getBearerToken(req: Request) {
//   const auth = req.headers.get("authorization") || "";
//   const m = auth.match(/^Bearer\s+(.+)$/i);
//   return m?.[1]?.trim() || null;
// }

// async function getProjectFromApiKey(apiKey: string) {
//   const { data: project, error } = await supabase
//     .from("projects")
//     .select("id, name, org_id")
//     .eq("api_key", apiKey)
//     .maybeSingle();

//   if (error) throw error;
//   return project;
// }

// export async function GET(req: Request) {
//   try {
//     const token = getBearerToken(req);
//     if (!token) {
//       return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
//     }

//     const project = await getProjectFromApiKey(token);
//     if (!project?.id) {
//       return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
//     }

//     const { data: folders, error } = await supabase
//       .from("folders")
//       .select("id, name, created_at")
//       .eq("project_id", project.id)
//       .order("created_at", { ascending: false });

//     if (error) throw error;

//     return NextResponse.json({
//       folders: folders ?? [],
//       count: (folders ?? []).length,
//     });
//   } catch (e: any) {
//     return NextResponse.json(
//       { error: e?.message || "Failed to load folders" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const token = getBearerToken(req);
//     if (!token) {
//       return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
//     }

//     const project = await getProjectFromApiKey(token);
//     if (!project?.id) {
//       return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
//     }

//     const body = await req.json().catch(() => ({}));
//     const name = String(body?.name || "").trim();
//     if (!name) {
//       return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
//     }

//     const { data: folder, error } = await supabase
//       .from("folders")
//       .insert({
//         project_id: project.id,
//         org_id: project.org_id,
//         name,
//       })
//       .select("id, name, created_at")
//       .single();

//     if (error) throw error;

//     return NextResponse.json({ folder });
//   } catch (e: any) {
//     return NextResponse.json(
//       { error: e?.message || "Failed to create folder" },
//       { status: 500 }
//     );
//   }
// }
