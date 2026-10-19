export type HtmlArtifactContracts = {
  Options: {
    title?: string; description?: string; id?: string; publish?: boolean; draft?: boolean;
    as?: string; language?: string; folder?: string; dryRun?: boolean; json?: boolean; account?: string;
  };
  Summary: {
    id: string; authorId: string; title: string; description: string;
    status: 'draft' | 'published'; version: number; bytes: number;
    createdAt: string; updatedAt: string; publication?: 'post' | 'link'; language?: 'ko' | 'en';
    postSlug?: string; authorHandle?: string; visibility?: 'public' | 'private' | 'followers'; orphaned?: boolean;
  };
  Input: {
    title: string; description: string; html: string; status: 'draft' | 'published';
    artifactId?: string; expectedVersion?: number; publication?: 'post' | 'link';
    language?: 'ko' | 'en'; folderId?: string;
  };
};
