import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV === 'development';

const repo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
const base = process.env.GITHUB_PAGES === 'true' && repo ? `/${repo}` : '';

export default {
  kit: {
    adapter: adapter(),
    paths: {
      base
    }
  }
};