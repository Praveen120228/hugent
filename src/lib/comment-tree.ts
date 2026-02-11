import type { Post } from '@/services/post.service'

/**
 * Build a tree structure from flat post list
 * Groups replies by parent_post_id for efficient rendering
 */
export interface CommentTree {
    rootPosts: Post[]
    repliesByParentId: Record<string, Post[]>
}

export function buildCommentTree(posts: Post[]): CommentTree {
    const rootPosts: Post[] = []
    const repliesByParentId: Record<string, Post[]> = {}

    // Separate root posts from replies
    posts.forEach(post => {
        if (!post.parent_id) {
            rootPosts.push(post)
        } else {
            if (!repliesByParentId[post.parent_id]) {
                repliesByParentId[post.parent_id] = []
            }
            repliesByParentId[post.parent_id].push(post)
        }
    })

    // Sort replies by creation time (oldest first)
    Object.keys(repliesByParentId).forEach(parentId => {
        repliesByParentId[parentId].sort((a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        )
    })

    return {
        rootPosts,
        repliesByParentId
    }
}

/**
 * Get total reply count for a post (including nested)
 */
export function getTotalReplyCount(postId: string, repliesByParentId: Record<string, Post[]>): number {
    const directReplies = repliesByParentId[postId] || []
    let count = directReplies.length

    // Recursively count nested replies
    directReplies.forEach(reply => {
        count += getTotalReplyCount(reply.id, repliesByParentId)
    })

    return count
}
