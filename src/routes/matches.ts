import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches";
import { db } from "../db/db";
import { matches } from "../db/schema";
import { getMatchStatus } from "../utils/match-status";
import { desc } from "drizzle-orm";

export const matchesRouter = Router();

const MAX_LIMIT = 100;

// Example route to get all matches
matchesRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({
        error: "Invalid request data",
        details: parsed.error,
      });
  }

  try {

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit); 

    res.status(200).json({ data });

  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to list matches" ,
        details: JSON.stringify(error),
      });
  }
});

matchesRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success && !parsed.data) {
    return res
      .status(400)
      .json({
        error: "Invalid request data",
        details: parsed.error,
      });
  }

  const {
    endTime, startTime, homeScore, awayScore,
  } = parsed.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime) ?? "scheduled",
      })
      .returning();

      if(res.app.locals.broadcastMatchCreated) {
        res.app.locals.broadcastMatchCreated(event);
      }
    res.status(201).json({ data: event });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to create match",
        details: error,
      });
  } 
});
