import fs from 'fs';
import esbuild from 'esbuild';
import {join} from 'path';
import {fileURLToPath} from 'url';

const publishDir = './build/static';
const entrypoint = './build/app';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} */
export default function (options) {
  return {
    name: 'svelte-adapter-lambda-edge',

    async adapt({utils}) {

      const files = fileURLToPath(new URL('./files', import.meta.url));

      utils.rimraf(publishDir);
      utils.rimraf(entrypoint);

      utils.log.minor('Generating app...');
      utils.copy(`${files}/entry.js`, '.svelte-kit/lambda-edge/entry.js');

      /** @type {BuildOptions} */
      const default_options = {
        entryPoints: ['.svelte-kit/lambda-edge/entry.js'],
        outfile: `${entrypoint}/index.js`,
        bundle: true,
				format: 'esm',
				platform: 'node',
				target: 'node14',
				external: ['@sveltejs/kit/install-fetch'],
        inject: [join(files, 'shims.js')],
        platform: 'node',
      };

      const build_options = options && options.esbuild ? await options.esbuild(default_options) : default_options;

      await esbuild.build(build_options);

      fs.writeFileSync(`${entrypoint}/package.json`, JSON.stringify({main: 'index.js'}));

      utils.log.info('Prerendering static pages...');
      await utils.prerender({
        dest: publishDir,
      });

      utils.log.minor('Copying assets...');
      utils.copy_static_files(publishDir);
      utils.copy_client_files(publishDir);
    },
  };
}
