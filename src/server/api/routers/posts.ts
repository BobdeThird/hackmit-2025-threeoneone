import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const postsRouter = createTRPCRouter({
  listMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({ 
      where: { authorId: ctx.userId }, 
      orderBy: { createdAt: "desc" } 
    });
  }),
  
  create: protectedProcedure
    .input(z.object({ 
      title: z.string().min(1), 
      content: z.string().optional() 
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.post.create({ 
        data: { 
          ...input, 
          authorId: ctx.userId 
        } 
      });
    }),
    
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.post.deleteMany({
        where: {
          id: input.id,
          authorId: ctx.userId, // Only allow users to delete their own posts
        },
      });
    }),
});