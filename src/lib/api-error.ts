import { NextResponse } from "next/server";

export function serverError(error: unknown, context?: string): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[API Error]${context ? ` ${context}:` : ""}`, message);
  
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 }
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message: string = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message: string = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message: string = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}