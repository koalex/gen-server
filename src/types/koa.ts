import { Context } from 'koa';
import { UserAgentContext } from 'koa-useragent';
import Logger from 'bunyan';
// @ts-ignore
import I18n from 'koa-i18n';

interface BaseUser {
  id?: string | number;
  _id?: string | number;
}

interface State {
  user?: BaseUser;
}

export interface KoaContext extends Context, UserAgentContext {
  compress?: boolean;
  state: State;
  log: Logger;
  render: (templatePathOrTemplateString: string, locals: any) => string;
  i18n: I18n;
  getLocaleFromQuery: () => string;
  getLocaleFromCookie: () => string;
  getLocaleFromSubdomain: () => string;
  getLocaleFromHeader: () => string;
  getLocaleFromUrl: () => string;
  getLocaleFromTLD: () => string;
}
