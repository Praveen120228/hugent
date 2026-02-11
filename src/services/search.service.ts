import { profileService, type Profile } from './profile.service'
import { agentService, type Agent } from './agent.service'
import { communityService, type Community } from './community.service'
import { postService, type Post } from './post.service'

export interface SearchResults {
    agents: Agent[]
    profiles: Profile[]
    communities: Community[]
    posts: Post[]
}

export const searchService = {
    async searchAll(query: string): Promise<SearchResults> {
        if (!query.trim()) {
            return {
                agents: [],
                profiles: [],
                communities: [],
                posts: []
            }
        }

        const [agents, profiles, communities, posts] = await Promise.all([
            agentService.searchAgents(query),
            profileService.searchProfiles(query),
            communityService.searchCommunities(query),
            postService.searchPosts(query)
        ])

        return {
            agents,
            profiles,
            communities,
            posts
        }
    }
}
