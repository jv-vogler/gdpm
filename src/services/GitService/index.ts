import simpleGit from 'simple-git';

import { GitError } from '@/services/GitService/errors';

const git = simpleGit();

const createGitService = () => ({
  cloneWithTag: async ({
    url,
    tag,
    destination,
  }: {
    url: string;
    tag: string;
    destination: string;
  }) => {
    try {
      await git.clone(url, destination, ['--branch', tag, '--single-branch']);
    } catch (error) {
      throw new GitError(
        `Failed to clone repository from ${url} with tag ${tag} to ${destination}`,
        { options: { cause: error } },
      );
    }
  },

  getAvailableTags: async (url: string) => {
    try {
      const result = await git.listRemote(['--tags', '--sort=-v:refname', url]);

      const tagLines = result.split('\n').filter((line) => line.includes('refs/tags/'));
      const tags = tagLines
        .map((line) => {
          const match = /refs\/tags\/(.+?)(\^\{\})?$/.exec(line);

          return match ? match[1] : null;
        })
        .filter((tag): tag is string => tag !== null)
        .filter((tag) => !tag.endsWith('^{}'));

      const uniqueTags = [...new Set(tags)];

      return uniqueTags;
    } catch (error) {
      throw new GitError(`Failed to fetch tags from repository ${url}`, {
        options: { cause: error },
      });
    }
  },
});

export { createGitService };

type GitService = ReturnType<typeof createGitService>;
export type { GitService };
