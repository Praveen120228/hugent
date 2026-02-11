import { supabase } from '@/lib/supabase'
import { POST_SELECT_QUERY } from './post.service'

export interface Collection {
    id: string
    user_id: string
    name: string
    description?: string
    created_at: string
    updated_at: string
}

export interface SavedItem {
    id: string
    user_id: string
    collection_id?: string
    post_id: string
    created_at: string
    post?: any // To be populated with post details
}

export const collectionService = {
    async getCollections(userId: string): Promise<Collection[]> {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async createCollection(name: string, description?: string): Promise<Collection> {
        const { data, error } = await supabase
            .from('collections')
            .insert({ name, description, user_id: (await supabase.auth.getUser()).data.user?.id })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteCollection(collectionId: string): Promise<void> {
        const { error } = await supabase
            .from('collections')
            .delete()
            .eq('id', collectionId)

        if (error) throw error
    },

    async saveItem(postId: string, collectionId?: string): Promise<SavedItem> {
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (!userId) throw new Error('User not authenticated')

        const { data, error } = await supabase
            .from('saved_items')
            .insert({
                user_id: userId,
                post_id: postId,
                collection_id: collectionId || null
            })
            .select()
            .single()

        if (error) {
            // Handle unique constraint violation (already saved) gracefully if needed
            if (error.code === '23505') throw new Error('Item already saved to this collection')
            throw error
        }
        return data
    },

    async unsaveItem(postId: string, collectionId?: string): Promise<void> {
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (!userId) throw new Error('User not authenticated')

        let query = supabase
            .from('saved_items')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId)

        if (collectionId) {
            query = query.eq('collection_id', collectionId)
        } else {
            query = query.is('collection_id', null)
        }

        const { error } = await query
        if (error) throw error
    },

    async getSavedItems(collectionId?: string): Promise<SavedItem[]> {
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (!userId) throw new Error('User not authenticated')

        let query = supabase
            .from('saved_items')
            .select(`*, post:posts(${POST_SELECT_QUERY})`)
            .eq('user_id', userId)

        if (collectionId) {
            query = query.eq('collection_id', collectionId)
        } else {
            // If no collection ID, maybe get all? Or uncategorized?
            // Usually "Saved Items" page shows all. "Uncategorized" shows null.
            // Let's support an explicit "null" filter if passed as 'uncategorized' or similar, 
            // but for now let's assume if collectionId is undefined, fetch ALL saved items.
        }

        // If we want to filter by "Uncategorized", we might need a specific flag or treat 'null' string as null.
        // For now, let's keep it simple: fetch all if no ID.

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async isItemSaved(postId: string): Promise<boolean> {
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (!userId) return false

        const { count, error } = await supabase
            .from('saved_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('post_id', postId)

        if (error) return false
        return (count || 0) > 0
    }
}
