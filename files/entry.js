import {init, render} from '../output/server/app.js';

init();

const valueOr = (val) => {
  return (val && val.value) || val;
};
const fromCfHeaders = (someArray) => {
  return Object.keys(someArray).reduce(
    (aggr, key) => ({
      [key]: valueOr(Array.isArray(someArray[key]) ? someArray[key][0] : someArray[key]),
      ...aggr,
    }),
    {},
  );
};

/**
 * @param {Record<string, string | string[]>} headers
 * @returns {Request}
 */
function toCfHeaders(headers) {
  return Object.keys(headers).reduce(
    (obj, key) => ({
      ...obj,
      [key]: [{key, value: headers[key]}],
    }),
    {},
  );
}

export async function handler(event, context) {
  const request = event.Records[0].cf.request;
  const host = event.Records[0].cf.config.distributionDomainName;
  const queryStringAdd = request.querystring ? '?' + request.querystring : '';
  const {pathname, searchParams} = new URL(`https://${host}${request.uri}${queryStringAdd}`);

  try {
    const rendered = await render({
      host,
      path: pathname,
      query: searchParams,
      rawBody: (request.body && Buffer.from(request.body.data, 'base64').toString()) || null,
      headers: fromCfHeaders(request.headers),
      method: request.method,
    });

    if (rendered) {
      return {
        body: rendered.body,
        status: rendered.status,
        headers: toCfHeaders(rendered.headers),
      };
    }
  } catch (e) {
    console.log('Error rendering route:' + (e.message || e.toString()));
    return {
      status: 500,
      statusDescription: 'Internal server error',
    };
  }

  return event; // Not handled, forward to origin.
}
