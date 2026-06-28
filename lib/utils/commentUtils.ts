import { Comment } from '@/types/post';

export interface ProcessedComment extends Comment {
  replies?: ProcessedComment[];
}

export function processComments(comments: Comment[]): ProcessedComment[] {
  if (!comments || !Array.isArray(comments)) return [];
  
  // Create a map for quick lookup
  const commentMap = new Map<string, ProcessedComment>();
  const rootComments: ProcessedComment[] = [];
  
  // First pass: create map and copy comments
  comments.forEach(comment => {
    const processedComment: ProcessedComment = {
      ...comment,
      replies: []
    };
    commentMap.set(comment._id, processedComment);
  });
  
  // Second pass: build tree structure
  comments.forEach(comment => {
    const processedComment = commentMap.get(comment._id);
    if (!processedComment) return;
    
    if (comment.parentComment) {
      // This is a reply, add to parent's replies
      const parent = commentMap.get(comment.parentComment);
      if (parent && parent.replies) {
        parent.replies.push(processedComment);
      }
    } else {
      // This is a root comment
      rootComments.push(processedComment);
    }
  });
  
  return rootComments;
}

// Helper to get all replies for a comment
export function getCommentReplies(comments: Comment[], commentId: string): Comment[] {
  return comments.filter(comment => comment.parentComment === commentId);
}