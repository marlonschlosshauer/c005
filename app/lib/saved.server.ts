import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as schema from "~/db/schema";
import { bookmarks, courses, lessons, modules, notes } from "~/db/schema";
import { noteBodySchema } from "~/lib/notes";

type Db = BetterSQLite3Database<typeof schema>;

export function getBookmark(db: Db, userId: number, lessonId: number) {
  return db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.lessonId, lessonId)))
    .get();
}

export function toggleBookmark(
  db: Db,
  userId: number,
  lessonId: number,
  now = new Date()
) {
  return db.transaction((tx) => {
    const existing = getBookmark(tx, userId, lessonId);
    if (existing) {
      tx.delete(bookmarks).where(eq(bookmarks.id, existing.id)).run();
      return false;
    }
    tx.insert(bookmarks)
      .values({ userId, lessonId, createdAt: now.toISOString() })
      .run();
    return true;
  });
}

export function getNote(db: Db, userId: number, lessonId: number) {
  return db
    .select({ body: notes.body, updatedAt: notes.updatedAt })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
    .get();
}

export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
) {
  const parsed = noteBodySchema.safeParse(body);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid note.",
    };
  const timestamp = now.toISOString();
  const note = db
    .insert(notes)
    .values({
      userId,
      lessonId,
      body: parsed.data,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [notes.userId, notes.lessonId],
      set: { body: parsed.data, updatedAt: timestamp },
    })
    .returning({ body: notes.body, updatedAt: notes.updatedAt })
    .get();
  return { ok: true as const, note };
}

// Resolve access once per Course before the Saved loader reads any Note bodies.
export function getSavedCourseIds(db: Db, userId: number) {
  return db
    .select({ courseId: modules.courseId })
    .from(bookmarks)
    .innerJoin(lessons, eq(bookmarks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(bookmarks.userId, userId))
    .union(
      db
        .select({ courseId: modules.courseId })
        .from(notes)
        .innerJoin(lessons, eq(notes.lessonId, lessons.id))
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(eq(notes.userId, userId))
    )
    .all()
    .map((row) => row.courseId);
}

export function getSavedForStudent(
  db: Db,
  userId: number,
  accessibleCourseIds: number[]
) {
  const lessonRef = {
    lessonId: lessons.id,
    lessonTitle: lessons.title,
    moduleTitle: modules.title,
    courseId: courses.id,
    courseTitle: courses.title,
    courseSlug: courses.slug,
  };
  const savedBookmarks = db
    .select({ id: bookmarks.id, createdAt: bookmarks.createdAt, ...lessonRef })
    .from(bookmarks)
    .innerJoin(lessons, eq(bookmarks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(
      and(
        eq(bookmarks.userId, userId),
        inArray(courses.id, accessibleCourseIds)
      )
    )
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id))
    .all();
  const savedNotes = db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      ...lessonRef,
    })
    .from(notes)
    .innerJoin(lessons, eq(notes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(
      and(eq(notes.userId, userId), inArray(courses.id, accessibleCourseIds))
    )
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
  return { savedBookmarks, savedNotes };
}

export function deleteSavedForLessons(db: Db, lessonIds: number[]) {
  db.delete(bookmarks).where(inArray(bookmarks.lessonId, lessonIds)).run();
  db.delete(notes).where(inArray(notes.lessonId, lessonIds)).run();
}
