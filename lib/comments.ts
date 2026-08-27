import { fetchPublic } from './portfolio';
import type { CommentDTO } from './reader/reader.api';

/**
 * Root threads per page. Mirrors `COMMENTS_PAGE_SIZE` on the API, which stays
 * the one that decides: asking for more than it allows gets capped there.
 */
export const COMMENTS_PAGE_SIZE = 10;

/**
 * One page of a discussion. `items` counts neither total: with pagination and
 * with heavy branches left behind, its length says nothing about the volume,
 * which is why the two counts travel next to it.
 */
export type CommentsPage = {
    items: CommentDTO[];
    /** Threads on the article, i.e. what pagination advances through. */
    totalRoots: number;
    /** Messages on the article, at any depth. What the heading shows. */
    totalComments: number;
};

/**
 * Cache tag of one article's discussion. Must match `commentsTag` on the API
 * exactly: the back POSTs this string to `/api/revalidate` after every write.
 *
 * Deliberately outside the `articles` tag family, and deliberately without a
 * locale variant: a comment belongs to its article in both languages, and it
 * must never purge the whole blog.
 */
export const commentsTag = (articleId: string) => `comments:${articleId}`;

/**
 * First page of an article's discussion, read at render time so the messages
 * are in the HTML rather than appearing a beat after hydration.
 *
 * The empty fallback is the right failure: an article stays readable when the
 * API is unreachable, and the client-side widget can still recover the thread.
 */
export const getArticleComments = (articleId: string) =>
    fetchPublic<CommentsPage>(
        `/articles/${articleId}/comments?take=${COMMENTS_PAGE_SIZE}`,
        [commentsTag(articleId)],
        { items: [], totalRoots: 0, totalComments: 0 }
    );
