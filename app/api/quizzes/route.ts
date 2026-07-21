import { NextResponse } from "next/server";
import { getQuizzes } from "@/lib/db";

export async function GET() {
  const quizzes = await getQuizzes(10);
  return NextResponse.json(quizzes);
}
