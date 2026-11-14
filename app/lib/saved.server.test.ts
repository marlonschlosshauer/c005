import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  deleteSavedForLessons,
  getBookmark,
  getNote,
  getSavedCourseIds,
  getSavedForStudent,
  saveNote,
  toggleBookmark,
} from "./saved.server";
import { approveRefundRequest, raiseRefundRequest } from "./refunds.server";
import { fakeNotifications } from "./notifications.fake.server";

let db: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;
let lesson: typeof schema.lessons.$inferSelect;
const first = new Date("2026-11-14T12:00:00Z");
const later = new Date("2026-11-14T13:00:00Z");

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);
  const module = db
    .insert(schema.modules)
    .values({
      courseId: base.course.id,
      title: "Basics",
      position: 1,
    })
    .returning()
    .get();
  lesson = db
    .insert(schema.lessons)
    .values({
      moduleId: module.id,
      title: "First lesson",
      position: 1,
    })
    .returning()
    .get();
});

function saved(userId = base.user.id, courseIds = [base.course.id]) {
  return getSavedForStudent(db, userId, courseIds);
}

function anotherLesson() {
  return db
    .insert(schema.lessons)
    .values({
      moduleId: lesson.moduleId,
      title: "Second lesson",
      position: 2,
    })
    .returning()
    .get();
}

describe("Bookmarks and Notes", () => {
  it("toggles a Bookmark on and off, keeping only one flag", () => {
    expect(toggleBookmark(db, base.user.id, lesson.id, first)).toBe(true);
    expect(getBookmark(db, base.user.id, lesson.id)).toBeDefined();
    expect(saved().savedBookmarks).toHaveLength(1);
    expect(toggleBookmark(db, base.user.id, lesson.id, later)).toBe(false);
    expect(getBookmark(db, base.user.id, lesson.id)).toBeUndefined();
    expect(saved().savedBookmarks).toEqual([]);
    expect(toggleBookmark(db, base.user.id, lesson.id, later)).toBe(true);
    expect(saved().savedBookmarks).toHaveLength(1);
  });

  it("saves trimmed plain text, replaces it, and advances last edited", () => {
    expect(getNote(db, base.user.id, lesson.id)).toBeUndefined();
    expect(
      saveNote(db, base.user.id, lesson.id, "  # My note\n*literal*  ", first)
    ).toMatchObject({ ok: true });
    expect(getNote(db, base.user.id, lesson.id)).toEqual({
      body: "# My note\n*literal*",
      updatedAt: first.toISOString(),
    });
    saveNote(db, base.user.id, lesson.id, "Revised", later);
    expect(getNote(db, base.user.id, lesson.id)).toEqual({
      body: "Revised",
      updatedAt: later.toISOString(),
    });
    expect(saved().savedNotes).toHaveLength(1);
  });

  it("accepts exactly 2,000 characters and refuses more without replacing the Note", () => {
    expect(
      saveNote(db, base.user.id, lesson.id, "x".repeat(2000), first).ok
    ).toBe(true);
    expect(
      saveNote(db, base.user.id, lesson.id, "x".repeat(2001), later)
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("2000"),
    });
    expect(getNote(db, base.user.id, lesson.id)?.body).toHaveLength(2000);
  });

  it("preserves the creation time when saving an empty replacement", () => {
    saveNote(db, base.user.id, lesson.id, "Draft", first);
    saveNote(db, base.user.id, lesson.id, "   ", later);
    expect(getNote(db, base.user.id, lesson.id)).toEqual({
      body: "",
      updatedAt: later.toISOString(),
    });
    const note = db
      .select({ createdAt: schema.notes.createdAt })
      .from(schema.notes)
      .get();
    expect(note?.createdAt).toBe(first.toISOString());
  });

  it("lists only the owning Student's data, newest first with Lesson and Course references", () => {
    const secondLesson = anotherLesson();
    toggleBookmark(db, base.user.id, lesson.id, first);
    toggleBookmark(db, base.user.id, secondLesson.id, later);
    saveNote(db, base.user.id, lesson.id, "Older", first);
    saveNote(db, base.user.id, secondLesson.id, "Newer", later);
    saveNote(
      db,
      base.instructor.id,
      lesson.id,
      "Someone else's private text",
      later
    );
    toggleBookmark(db, base.instructor.id, lesson.id, later);
    expect(saved().savedBookmarks.map((row) => row.lessonTitle)).toEqual([
      "Second lesson",
      "First lesson",
    ]);
    expect(saved().savedNotes.map((row) => row.body)).toEqual([
      "Newer",
      "Older",
    ]);
    for (const row of [...saved().savedBookmarks, ...saved().savedNotes]) {
      expect(row).toMatchObject({
        courseTitle: base.course.title,
        courseSlug: base.course.slug,
      });
    }
    expect(saved(base.instructor.id).savedNotes.map((row) => row.body)).toEqual(
      ["Someone else's private text"]
    );
    saveNote(
      db,
      base.user.id,
      lesson.id,
      "Most recent edit",
      new Date("2026-11-14T14:00:00Z")
    );
    expect(saved().savedNotes.map((row) => row.body)).toEqual([
      "Most recent edit",
      "Newer",
    ]);
  });

  it("excludes inaccessible Courses while retaining saved data", () => {
    toggleBookmark(db, base.user.id, lesson.id);
    saveNote(db, base.user.id, lesson.id, "Private", first);
    expect(getSavedCourseIds(db, base.user.id)).toEqual([base.course.id]);
    expect(getSavedCourseIds(db, base.instructor.id)).toEqual([]);
    expect(saved(base.user.id, [])).toEqual({
      savedBookmarks: [],
      savedNotes: [],
    });
    expect(saved().savedNotes[0]?.body).toBe("Private");
  });

  it("keeps Bookmarks and Notes after an approved Refund", async () => {
    const notifications = fakeNotifications();
    const admin = db
      .insert(schema.users)
      .values({
        name: "Admin",
        email: "admin@example.com",
        role: schema.UserRole.Admin,
      })
      .returning()
      .get();
    const purchase = db
      .insert(schema.purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 7900,
        createdAt: first.toISOString(),
      })
      .returning()
      .get();
    db.insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    toggleBookmark(db, base.user.id, lesson.id, first);
    saveNote(db, base.user.id, lesson.id, "Keep for when I return", first);
    const raised = await raiseRefundRequest(
      db,
      purchase.id,
      base.user.id,
      "Changed my mind",
      later,
      notifications
    );
    if (!raised.ok) throw new Error(raised.error);
    expect(
      await approveRefundRequest(
        db,
        raised.refundRequestId,
        admin.id,
        null,
        later,
        notifications
      )
    ).toMatchObject({ ok: true });
    expect(
      db
        .select()
        .from(schema.enrollments)
        .where(eq(schema.enrollments.userId, base.user.id))
        .all()
    ).toEqual([]);
    expect(getBookmark(db, base.user.id, lesson.id)).toBeDefined();
    expect(getNote(db, base.user.id, lesson.id)?.body).toBe(
      "Keep for when I return"
    );
  });

  it("cleans up saved items for deleted Lessons without affecting other Lessons", () => {
    const secondLesson = anotherLesson();
    for (const item of [lesson, secondLesson]) {
      toggleBookmark(db, base.user.id, item.id);
      saveNote(db, base.user.id, item.id, item.title, first);
    }
    db.transaction((tx) => {
      deleteSavedForLessons(tx, [lesson.id]);
      tx.delete(schema.lessons).where(eq(schema.lessons.id, lesson.id)).run();
    });
    expect(saved().savedBookmarks.map((row) => row.lessonTitle)).toEqual([
      secondLesson.title,
    ]);
    expect(saved().savedNotes.map((row) => row.body)).toEqual([
      secondLesson.title,
    ]);
  });
});
