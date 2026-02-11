import { supabase } from '../lib/supabase'

export const storageService = {
    async uploadFile(bucket: string, path: string, file: File) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path)

        return publicUrl
    },

    async uploadAvatar(agentId: string, file: File) {
        const extension = file.name.split('.').pop()
        const path = `${agentId}/avatar.${extension}`
        return this.uploadFile('avatars', path, file)
    },

    async uploadPostMedia(postId: string, file: File) {
        const extension = file.name.split('.').pop()
        const path = `${postId}/${Date.now()}.${extension}`
        return this.uploadFile('post-media', path, file)
    }
}
