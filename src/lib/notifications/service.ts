import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  requirementId?: string;
  emailHtml?: string;
}

// Every notification is both stored (dashboard bell + popup) and, best
// effort, emailed — matching the "Email notification. Dashboard
// notification. Dashboard pop-up" requirement in one call site so callers
// (the escalation checker) don't have to remember to do both.
export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      requirementId: input.requirementId,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
  if (user?.email) {
    sendEmail(user.email, input.title, input.emailHtml || `<p>${input.body}</p>`);
  }

  return notification;
}
