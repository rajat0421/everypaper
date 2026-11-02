import { ModerationReportModel, ModerationActionModel } from "./moderation.model.js";
import { moderatorRemoveStroke } from "../strokes/stroke.service.js";
import { moderatorRemoveText } from "../texts/text.service.js";

export interface CreateReportInput {
  targetType: "stroke" | "text";
  targetId: string;
  reason: string;
  reporterSessionId: string;
}

export async function createReport(input: CreateReportInput) {
  return ModerationReportModel.create(input);
}

export async function moderatorRemove(
  targetType: "stroke" | "text",
  targetId: string,
  moderatorId: string,
  reason?: string
) {
  if (targetType === "stroke") {
    await moderatorRemoveStroke(targetId);
  } else {
    await moderatorRemoveText(targetId);
  }
  return ModerationActionModel.create({
    targetType,
    targetId,
    action: "remove",
    moderatorId,
    reason
  });
}
