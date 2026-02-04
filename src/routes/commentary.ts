import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary";
import { db } from "../db/db";
import { commentary } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const commentaryRouter = Router({mergeParams: true});

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: parsedParams.error,
    });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsedQuery.error,
    });
  }

  try {
    const limit = parsedQuery.data.limit ?? 50;

    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, parsedParams.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    res.status(200).json({ data });
  } catch (error) {  
    res.status(500).json({
      error: "Failed to list commentary",
      details: JSON.stringify(error),
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: parsedParams.error,
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid request data",
      details: parsedBody.error,
    });
  }

  try {
    const [event] = await db
      .insert(commentary)
      .values({
        matchId: parsedParams.data.id,
        ...parsedBody.data,
        tags: JSON.stringify(parsedBody.data.tags),
      })
      .returning();

    if(res.app.locals.broadcastCommentary) {
        res.app.locals.broadcastCommentary(parsedParams.data.id, event);
    }

    res.status(201).json({ data: event });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create commentary",
      details: error,
    });
  }
});
